export type AppStatus = 'ready' | 'beta' | 'soon';

export interface InstallerSpec {
  /** Must match the version this build's sha256 was computed from. */
  version: string;
  /** Lowercase hex SHA256 of the exact file at downloadUrl. */
  sha256: string;
  installerType: 'nsis' | 'msi';
  /** Args passed to the installer executable (nsis) or to msiexec (msi). */
  silentArgs: string[];
  /**
   * Path of the Start Menu shortcut the installer creates, relative to
   * "...\Start Menu\Programs\" (e.g. "Smart Task Manager\\smart-task-manager.lnk").
   * Resolved after a silent install by reading the shortcut's real
   * target — more reliable than computing %LOCALAPPDATA%\<app> ourselves,
   * since the installer's own install-directory logic doesn't always
   * agree with what the OS reports as LocalAppData.
   */
  startMenuShortcut: string;
}

export interface AppPlatform {
  /** e.g. "Microsoft Excel (Windows)" */
  label: string;
  /** Short note shown under the label, e.g. "Setup.exe · cài add-in và template .xltx" */
  note: string;
  /** Label of the download button, e.g. "Tải Setup.exe" */
  actionLabel: string;
  /** GitHub Release asset URL. Null when not published yet. */
  downloadUrl: string | null;
  /** Present only for platforms Hub can download/verify/install itself. */
  installer?: InstallerSpec;
}

export interface AppFeature {
  title: string;
  desc: string;
}

export interface AppEntry {
  id: string;
  /** Short badge text, e.g. "ST" */
  badge: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  tags: string[];
  category: string;
  status: AppStatus;
  featured?: boolean;
  platforms: AppPlatform[];
  features?: AppFeature[];
  installSteps?: string[];
}

/**
 * Bundled fallback — used only if the remote manifest (apps-manifest.json,
 * fetched by useAppsManifest()) can't be reached. Keeping this in sync
 * with the remote file isn't required for correctness (it's a fallback,
 * not a cache), but should roughly track it so offline users still see
 * something reasonable.
 */
export const DEFAULT_APPS: AppEntry[] = [
  {
    id: 'smart-task-manager',
    badge: 'ST',
    name: 'Smart Task Manager',
    shortDesc:
      'Ứng dụng Desktop quản lý công việc: Dashboard, Kanban, Calendar, Gantt và SmartScore.',
    longDesc:
      'Ứng dụng Desktop (Windows) quản lý công việc cá nhân: theo dõi task, deadline, dự án và thành viên với Dashboard, Kanban, Calendar, Gantt và báo cáo. SmartScore và Risk được tính bằng quy tắc rõ ràng, không cần AI. Đồng bộ với backend riêng, không phải add-in Excel.',
    tags: ['Windows Desktop', 'Web App'],
    category: 'Quản lý công việc',
    status: 'ready',
    featured: true,
    platforms: [
      {
        label: 'Windows Desktop (khuyên dùng)',
        note: 'Setup.exe · cài ứng dụng Smart Task Manager, không cần Excel',
        actionLabel: 'Tải Setup.exe',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/download/v0.1.0/smart-task-manager_0.1.0_x64-setup.exe',
        installer: {
          version: '0.1.0',
          sha256: 'c701b40de44010d697500dc3be05ff3086f69590921fc5de4555aa9e3c782889',
          installerType: 'nsis',
          silentArgs: ['/S'],
          startMenuShortcut: 'Smart Task Manager\\smart-task-manager.lnk',
        },
      },
      {
        label: 'Windows Desktop (.msi)',
        note: 'Dùng nếu công ty/tổ chức bạn yêu cầu cài qua MSI',
        actionLabel: 'Tải .msi',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/download/v0.1.0/smart-task-manager_0.1.0_x64_en-US.msi',
        installer: {
          version: '0.1.0',
          sha256: 'c9ea7177e03dcbd8d6062721e31782bf8c3d5c70c142baac72410fe1c4c16a62',
          installerType: 'msi',
          silentArgs: ['/qn'],
          startMenuShortcut: 'Smart Task Manager\\smart-task-manager.lnk',
        },
      },
    ],
    features: [
      { title: 'Dashboard & Today', desc: 'KPI, Focus Today và các task cần chú ý nhất.' },
      { title: 'Kanban, Calendar, Gantt', desc: 'Ba góc nhìn từ cùng một nguồn dữ liệu Tasks.' },
      {
        title: 'SmartScore & Risk',
        desc: 'Điểm ưu tiên 0-100 giải thích được, cấu hình trong Settings.',
      },
      { title: 'Nhắc deadline', desc: 'Thông báo quá hạn, đến hạn hôm nay và task bị chặn.' },
      { title: 'Dự án & Thành viên', desc: 'Project Health và workload của từng người.' },
      { title: 'Báo cáo', desc: 'Báo cáo ngày, tuần, tháng và hiệu suất dự án.' },
    ],
    installSteps: [
      'Tải Setup.exe và chạy trình cài đặt.',
      'Mở ứng dụng Smart Task Manager vừa cài từ Start Menu.',
      'Đăng nhập (hoặc tạo tài khoản) để bắt đầu quản lý công việc.',
    ],
  },
  {
    id: 'content-manager',
    badge: 'CM',
    name: 'Content Manager',
    shortDesc: 'Lên lịch, theo dõi trạng thái và quản lý nội dung từ ý tưởng đến xuất bản.',
    longDesc:
      'Ứng dụng quản lý nội dung cho đội ngũ marketing: Dashboard, danh sách nội dung, Kanban kéo thả, lịch đăng bài, thư viện media, chiến dịch và báo cáo cho Facebook, TikTok, YouTube, Website và Zalo. Có bản Web, Mobile (Android/iOS) và Windows Desktop, dùng chung backend Content Manager (ASP.NET Core + PostgreSQL).',
    tags: ['Windows Desktop', 'Web App', 'Mobile'],
    category: 'Nội dung',
    status: 'ready',
    platforms: [
      {
        label: 'Windows Desktop (khuyên dùng)',
        note: 'Setup.exe · kết nối sẵn tới máy chủ Content Manager (Railway)',
        actionLabel: 'Tải Setup.exe',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/download/content-manager-v0.1.3/content-manager_0.1.3_x64-setup.exe',
        installer: {
          version: '0.1.3',
          sha256: '0bccd02bd946dca2fd83132f09cde147decce42b726ff63add76e94fc6466fcc',
          installerType: 'nsis',
          silentArgs: ['/S'],
          startMenuShortcut: 'Content Manager\\content-manager.lnk',
        },
      },
      {
        label: 'Windows Desktop (.msi)',
        note: 'Dùng nếu công ty/tổ chức bạn yêu cầu cài qua MSI',
        actionLabel: 'Tải .msi',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/download/content-manager-v0.1.3/content-manager_0.1.3_x64_en-US.msi',
        installer: {
          version: '0.1.3',
          sha256: 'c37e3d135638595d2d4ba786c0fd3a2e15f99700a14a3a381c35a442d2430082',
          installerType: 'msi',
          silentArgs: ['/qn'],
          startMenuShortcut: 'Content Manager\\content-manager.lnk',
        },
      },
    ],
    features: [
      {
        title: 'Tổng quan',
        desc: 'KPI tuần/tháng, việc cần tập trung hôm nay và hoạt động gần đây.',
      },
      {
        title: 'Kanban kéo thả',
        desc: 'Chuyển trạng thái từ Ý tưởng đến Đã đăng chỉ bằng một lần kéo.',
      },
      {
        title: 'Lịch đăng bài',
        desc: 'Xem theo tháng, tuần hoặc danh sách, lọc theo kênh.',
      },
      {
        title: 'Thư viện media',
        desc: 'Tải lên ảnh/video và đính kèm vào nội dung.',
      },
      {
        title: 'Chiến dịch & Báo cáo',
        desc: 'Nhóm nội dung theo chiến dịch, xuất báo cáo CSV.',
      },
      {
        title: 'Web, Mobile, Desktop',
        desc: 'Một codebase chạy trên trình duyệt, Android/iOS và Windows.',
      },
    ],
    installSteps: [
      'Tải Setup.exe và chạy trình cài đặt.',
      'Mở Content Manager vừa cài — ứng dụng kết nối sẵn tới máy chủ Railway, không cần chạy backend local.',
      'Đăng ký tài khoản đầu tiên (hoặc đăng nhập) — tài khoản đầu tiên là Quản trị viên.',
      'Có thể đổi địa chỉ máy chủ trong Cài đặt → Máy chủ nếu dùng backend riêng.',
    ],
  },
  {
    id: 'voicescribe',
    badge: 'VS',
    name: 'VoiceScribe',
    shortDesc: 'Chuyển file ghi âm thành văn bản có mốc thời gian, xuất ra Word.',
    longDesc:
      'Ứng dụng chuyển giọng nói thành văn bản: tải lên file ghi âm (mp3, m4a, wav, mp4, webm), nhận bản chép lời có mốc thời gian, lưu thư viện bản ghi theo tài khoản, sắp xếp theo thư mục và xuất ra Word/TXT/SRT. Có bản Web và Windows Desktop, dùng chung máy chủ VoiceScribe (Node.js + Hugging Face).',
    tags: ['Windows Desktop', 'Web App'],
    category: 'Ghi âm & Văn bản',
    status: 'ready',
    platforms: [
      {
        label: 'Windows Desktop (khuyên dùng)',
        note: 'Setup.exe · kết nối sẵn tới máy chủ VoiceScribe (Railway)',
        actionLabel: 'Tải Setup.exe',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/download/voicescribe-v0.2.5/voicescribe_0.2.5_x64-setup.exe',
        installer: {
          version: '0.2.5',
          sha256: '2ed92e33d02500e3435503a9c483d4bd4c54183872070f17a7293c7c4b3d406f',
          installerType: 'nsis',
          silentArgs: ['/S'],
          startMenuShortcut: 'VoiceScribe\\voicescribe.lnk',
        },
      },
      {
        label: 'Windows Desktop (.msi)',
        note: 'Dùng nếu công ty/tổ chức bạn yêu cầu cài qua MSI',
        actionLabel: 'Tải .msi',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/download/voicescribe-v0.2.5/voicescribe_0.2.5_x64_en-US.msi',
        installer: {
          version: '0.2.5',
          sha256: '979674c619b2c75f4650b757b5fe8cbbe4fbb767aefb5862810205e0fa3ec66e',
          installerType: 'msi',
          silentArgs: ['/qn'],
          startMenuShortcut: 'VoiceScribe\\voicescribe.lnk',
        },
      },
    ],
    features: [
      {
        title: 'Chép lời tự động',
        desc: 'Chuyển giọng nói thành văn bản kèm mốc thời gian từng đoạn.',
      },
      {
        title: 'File dài',
        desc: 'Tự chia file âm thanh dài thành nhiều đoạn rồi ghép lại.',
      },
      {
        title: 'Thư viện bản ghi',
        desc: 'Mọi bản ghi được lưu theo tài khoản, có tìm kiếm và thư mục.',
      },
      {
        title: 'Xuất Word',
        desc: 'Tải bản chép lời về dạng tài liệu .docx.',
      },
      {
        title: 'Web & Desktop',
        desc: 'Dùng trên trình duyệt hoặc cài ứng dụng Windows.',
      },
    ],
    installSteps: [
      'Tải Setup.exe và chạy trình cài đặt.',
      'Mở VoiceScribe vừa cài — ứng dụng kết nối sẵn tới máy chủ Railway.',
      'Tạo tài khoản (cần mã mời nếu máy chủ yêu cầu) hoặc đăng nhập.',
      'Tải file ghi âm lên để nhận bản chép lời, tự lưu vào thư viện.',
    ],
  },
  {
    id: 'giao-trinh-word',
    badge: 'W',
    name: 'Giáo Trình Word Add-in',
    shortDesc: 'Task Pane hỗ trợ định dạng, chuẩn hóa văn bản và tra cứu phím tắt ngay trong Word.',
    longDesc: 'Task Pane hỗ trợ định dạng, chuẩn hóa văn bản và tra cứu phím tắt ngay trong Word.',
    tags: ['Word', 'Office Add-in'],
    category: 'Word',
    status: 'ready',
    platforms: [
      {
        label: 'Microsoft Word (Windows)',
        note: 'Setup.exe · cài add-in',
        actionLabel: 'Tải về',
        downloadUrl:
          'https://github.com/thinlam/GiaoTrinhWord/releases/latest/download/GiaoTrinhWord-Setup.exe',
      },
    ],
  },
  {
    id: 'giao-trinh-excel',
    badge: 'X',
    name: 'Giáo Trình Excel Add-in',
    shortDesc: 'Công cụ công thức, làm sạch dữ liệu và bài học thực hành tích hợp trong Excel.',
    longDesc: 'Công cụ công thức, làm sạch dữ liệu và bài học thực hành tích hợp trong Excel.',
    tags: ['Excel', 'Office Add-in'],
    category: 'Excel',
    status: 'ready',
    platforms: [
      {
        label: 'Microsoft Excel (Windows)',
        note: 'Setup.exe · cài add-in',
        actionLabel: 'Tải về',
        downloadUrl:
          'https://github.com/thinlam/GiaoTrinhExcel/releases/latest/download/GiaoTrinhExcel-Setup.exe',
      },
    ],
  },
  {
    id: 'ai-formula-assistant',
    badge: 'fx',
    name: 'AI Formula Assistant',
    shortDesc: 'Mô tả bằng tiếng Việt, nhận công thức Excel kèm giải thích từng bước.',
    longDesc: 'Mô tả bằng tiếng Việt, nhận công thức Excel kèm giải thích từng bước.',
    tags: ['Excel', 'AI'],
    category: 'AI',
    status: 'beta',
    platforms: [
      {
        label: 'Microsoft Excel (Windows)',
        note: 'Bản Beta · cần đăng ký API key',
        actionLabel: 'Dùng thử Beta',
        downloadUrl:
          'https://github.com/thinlam/AIFormulaAssistant/releases/latest/download/AIFormulaAssistant-Setup.exe',
      },
    ],
  },
  {
    id: 'grammar-checker',
    badge: 'Ab',
    name: 'Grammar Checker',
    shortDesc: 'Kiểm tra chính tả, ngữ pháp và gợi ý viết lại câu cho tài liệu Word.',
    longDesc: 'Kiểm tra chính tả, ngữ pháp và gợi ý viết lại câu cho tài liệu Word.',
    tags: ['Word', 'AI'],
    category: 'AI',
    status: 'soon',
    platforms: [],
  },
  {
    id: 'data-cleaner',
    badge: 'DC',
    name: 'Data Cleaner',
    shortDesc: 'Xóa trùng lặp, cắt khoảng trắng, phát hiện ô lỗi và chuẩn hóa dữ liệu hàng loạt.',
    longDesc: 'Xóa trùng lặp, cắt khoảng trắng, phát hiện ô lỗi và chuẩn hóa dữ liệu hàng loạt.',
    tags: ['Excel'],
    category: 'Excel',
    status: 'soon',
    platforms: [],
  },
  {
    id: 'template-library',
    badge: 'TL',
    name: 'Template Library',
    shortDesc: 'Mẫu sổ sách, báo cáo và dashboard dùng sẵn để tạo workbook mới nhanh hơn.',
    longDesc: 'Mẫu sổ sách, báo cáo và dashboard dùng sẵn để tạo workbook mới nhanh hơn.',
    tags: ['Excel', '.xltx'],
    category: 'Excel',
    status: 'soon',
    platforms: [],
  },
];

export function getAppById(apps: AppEntry[], id: string): AppEntry | undefined {
  return apps.find((app) => app.id === id);
}

export function getFeaturedApp(apps: AppEntry[]): AppEntry | undefined {
  return apps.find((app) => app.featured) ?? apps.find((app) => app.status === 'ready');
}

export function getCategories(apps: AppEntry[]): string[] {
  return ['Tất cả', ...Array.from(new Set(apps.map((app) => app.category)))];
}
