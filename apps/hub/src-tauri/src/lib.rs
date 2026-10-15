use tauri::Manager;

/// Reads a whitelisted environment variable, exactly as the installer
/// itself (NSIS) would see it. Needed because Tauri's path API resolves
/// %LOCALAPPDATA% via the OS known-folder API, which can diverge from
/// the actual LOCALAPPDATA env var on a machine where it's been
/// redirected (e.g. to a non-system drive) — NSIS and this command both
/// read the real env var, so they agree on where the app was installed.
#[tauri::command]
fn get_env_var(name: String) -> Result<String, String> {
  match name.as_str() {
    "LOCALAPPDATA" | "USERPROFILE" => {
      std::env::var(&name).map_err(|_| format!("{name} is not set"))
    }
    _ => Err(format!("env var \"{name}\" is not allowed")),
  }
}

/// Launches an installed app by its resolved absolute exe path.
/// Bypasses the opener plugin's ACL (allow-open-path requires a static
/// scope expressed with the same $VAR path-variable system that, on at
/// least one real test machine, does not resolve to where the app is
/// actually installed — see resolve_shortcut_target). `path` here is
/// never arbitrary: the frontend only ever calls this with a value it
/// just got back from resolve_shortcut_target, which itself only reads
/// a shortcut this app's own manifest names.
///
/// Hides Hub's own window while the launched app is running, and shows
/// it again as soon as that app's process exits — Hub stays alive in
/// the background (so it doesn't lose its install-state cache or need
/// a full relaunch) but stays out of the way while the app is open.
#[tauri::command]
fn open_installed_app(app: tauri::AppHandle, path: String) -> Result<(), String> {
  let mut child = std::process::Command::new(&path)
    .spawn()
    .map_err(|e| e.to_string())?;

  if let Some(window) = app.get_webview_window("main") {
    let _ = window.hide();
  }

  std::thread::spawn(move || {
    let _ = child.wait();
    if let Some(window) = app.get_webview_window("main") {
      let _ = window.show();
      let _ = window.set_focus();
    }
  });

  Ok(())
}

/// Checks whether a file exists at an absolute path. Bypasses the fs
/// plugin's own scope resolution — plain filesystem check, not a file
/// read/write, so no broader access is granted by it.
#[tauri::command]
fn path_exists(path: String) -> bool {
  std::path::Path::new(&path).exists()
}

/// Resolves the real target of a Start Menu shortcut the installer
/// itself created, under
/// %APPDATA%\Microsoft\Windows\Start Menu\Programs\<relative_path>.
/// This is the ground truth for where NSIS actually placed the app —
/// more reliable than computing %LOCALAPPDATA%\<app> ourselves, since
/// on at least one real test machine NSIS's own install-directory
/// resolution disagreed with every OS-level LocalAppData source (the
/// registry's "User Shell Folders" key, the LOCALAPPDATA env var, and
/// Tauri's known-folder API all agreed with each other, and all three
/// were wrong). The shortcut's target is whatever NSIS actually wrote,
/// so reading it back removes the guess entirely.
#[tauri::command]
fn resolve_shortcut_target(relative_path: String) -> Result<String, String> {
  let app_data = std::env::var("APPDATA").map_err(|_| "APPDATA is not set".to_string())?;
  let link_path = std::path::Path::new(&app_data)
    .join("Microsoft")
    .join("Windows")
    .join("Start Menu")
    .join("Programs")
    .join(&relative_path);
  if !link_path.exists() {
    return Err(format!("shortcut not found: {}", link_path.display()));
  }
  let script = format!(
    "(New-Object -ComObject WScript.Shell).CreateShortcut('{}').TargetPath",
    link_path.display().to_string().replace('\'', "''")
  );
  let output = std::process::Command::new("powershell.exe")
    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
    .output()
    .map_err(|e| e.to_string())?;
  if !output.status.success() {
    return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
  }
  let target = String::from_utf8_lossy(&output.stdout).trim().to_string();
  if target.is_empty() {
    return Err("shortcut target is empty".to_string());
  }
  Ok(target)
}

/// Runs a self-install installer. Only two shapes are permitted, enforced
/// here in Rust (not by a static webview-facing ACL, which cannot express
/// "any file under this app's own cache dir" across different users'
/// machines):
///   - program == "msiexec": the path following "/i" in `args` must
///     resolve to a file inside this app's own cache dir.
///   - any other program: `program` itself must resolve to a file inside
///     this app's own cache dir.
/// The frontend never supplies an arbitrary command — `program`/`args`
/// are built from the file Hub itself just downloaded and SHA256-verified
/// into that same cache dir (see apps/hub/src/lib/installManager.ts).
#[tauri::command]
fn run_installer(app: tauri::AppHandle, program: String, args: Vec<String>) -> Result<i32, String> {
  let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
  let cache_dir = cache_dir
    .canonicalize()
    .map_err(|e| format!("cache dir does not exist: {e}"))?;

  let candidate_path = if program.eq_ignore_ascii_case("msiexec") {
    let idx = args
      .iter()
      .position(|a| a == "/i")
      .ok_or_else(|| "msiexec call missing /i <path>".to_string())?;
    args
      .get(idx + 1)
      .cloned()
      .ok_or_else(|| "msiexec call missing path after /i".to_string())?
  } else {
    program.clone()
  };

  let candidate = std::path::PathBuf::from(&candidate_path)
    .canonicalize()
    .map_err(|e| format!("installer file not found: {e}"))?;
  if !candidate.starts_with(&cache_dir) {
    return Err("installer path is outside the app's own cache directory".to_string());
  }

  let status = std::process::Command::new(&program)
    .args(&args)
    .status()
    .map_err(|e| e.to_string())?;
  Ok(status.code().unwrap_or(-1))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      get_env_var,
      path_exists,
      resolve_shortcut_target,
      run_installer,
      open_installed_app
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
