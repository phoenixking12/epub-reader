package com.epubreader.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.ActionMode;
import android.view.KeyEvent;
import android.view.MenuItem;
import android.view.View;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingEpubPlugin.class);
        registerPlugin(VolumeKeysPlugin.class);
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#1c1917"));
        getWindow().setNavigationBarColor(Color.parseColor("#1c1917"));
        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(Color.parseColor("#1c1917"));
            content.post(this::applySystemBarInsets);
        } else {
            applySystemBarInsets();
        }
    }

    private void applySystemBarInsets() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        View webView = getBridge().getWebView();
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), webView);
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            v.setPadding(0, 0, 0, nav.bottom);
            String js =
                    "document.documentElement.style.setProperty('--lg-sat','0px');"
                            + "document.documentElement.style.setProperty('--lg-sab','"
                            + nav.bottom
                            + "px');";
            if (v instanceof WebView) {
                ((WebView) v).evaluateJavascript(js, null);
            }
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && getBridge() != null) {
            PluginHandle handle = getBridge().getPlugin("VolumeKeys");
            if (handle != null && handle.getInstance() instanceof VolumeKeysPlugin) {
                VolumeKeysPlugin plugin = (VolumeKeysPlugin) handle.getInstance();
                if (plugin.handleKey(event.getKeyCode())) {
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        super.onActionModeStarted(mode);
        if (mode == null || mode.getMenu() == null) return;
        mode.getMenu().clear();
        MenuItem keep = mode.getMenu().add(" ");
        keep.setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        keep.setVisible(false);
        keep.setEnabled(false);
    }
}
