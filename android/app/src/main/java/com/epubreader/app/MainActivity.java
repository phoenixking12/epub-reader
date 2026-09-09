package com.epubreader.app;

import android.os.Bundle;
import android.view.ActionMode;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingEpubPlugin.class);
        registerPlugin(VolumeKeysPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View content = findViewById(android.R.id.content);
        if (content != null) content.post(this::applySystemBarInsets);
        else applySystemBarInsets();
    }

    @Override
    public void onStart() {
        super.onStart();
        applySystemBarInsets();
    }

    private void applySystemBarInsets() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        View webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            pushInsets(v, bars.top, bars.bottom, bars.left, bars.right);
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
        webView.setOnLongClickListener(v -> true);
    }

    private void pushInsets(View webView, int top, int bottom, int left, int right) {
        if (!(webView instanceof WebView)) return;
        String js = "(function(t,b,l,r){"
            + "var d=document.documentElement;if(!d)return;"
            + "d.style.setProperty('--lg-sat',t+'px');"
            + "d.style.setProperty('--lg-sab',b+'px');"
            + "d.style.setProperty('--lg-sal',l+'px');"
            + "d.style.setProperty('--lg-sar',r+'px');"
            + "})(" + top + "," + bottom + "," + left + "," + right + ")";
        ((WebView) webView).evaluateJavascript(js, null);
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
    public ActionMode startActionMode(ActionMode.Callback callback) {
        return null;
    }

    @Override
    public ActionMode startActionMode(ActionMode.Callback callback, int type) {
        return null;
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        super.onActionModeStarted(mode);
        if (mode != null) {
            mode.finish();
        }
    }

    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback) {
        return null;
    }

    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback, int type) {
        return null;
    }
}
