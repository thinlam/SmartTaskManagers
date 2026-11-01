package com.contentmanager.app;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15 draws apps edge-to-edge, and Capacitor 7's WebView reports no safe-area
        // insets, so the web content would sit under the status bar, camera cut-out and the
        // 3-button/gesture navigation bar. Pad the window by those insets natively instead.
        boolean dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(Color.parseColor(dark ? "#0f172a" : "#f6f8fc"));
        WindowCompat.getInsetsController(getWindow(), content).setAppearanceLightStatusBars(!dark);
        WindowCompat.getInsetsController(getWindow(), content).setAppearanceLightNavigationBars(!dark);

        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
