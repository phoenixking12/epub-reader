package com.loreguard.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !allowed(url)) {
            call.reject("That download link is not a GitHub release");
            return;
        }
        if (getActivity() == null) {
            call.reject("Update is not available right now");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            settings.setData(Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(settings);
            call.reject("Allow LoreGuard to install updates, then tap Update again");
            return;
        }
        new Thread(() -> {
            try {
                File apk = download(url);
                if (getActivity() == null) {
                    call.reject("Update is not available right now");
                    return;
                }
                getActivity().runOnUiThread(() -> {
                    try {
                        install(apk);
                        call.resolve();
                    } catch (Exception e) {
                        call.reject(message(e, "Could not open the installer"));
                    }
                });
            } catch (Exception e) {
                call.reject(message(e, "Download failed"));
            }
        }).start();
    }

    private File download(String start) throws Exception {
        String current = start;
        HttpURLConnection conn = null;
        for (int hop = 0; hop < 5; hop++) {
            if (!allowed(current)) throw new Exception("That download link is not a GitHub release");
            URL url = new URL(current);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(180000);
            conn.setRequestProperty("Accept", "application/octet-stream");
            conn.setRequestProperty("User-Agent", "LoreGuard");
            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                String next = conn.getHeaderField("Location");
                conn.disconnect();
                conn = null;
                if (next == null || next.isEmpty()) throw new Exception("Download failed");
                current = new URL(url, next).toString();
                continue;
            }
            if (code < 200 || code >= 300) {
                conn.disconnect();
                throw new Exception("Download failed (" + code + ")");
            }
            break;
        }
        if (conn == null) throw new Exception("Download failed");
        File dir = getContext().getCacheDir();
        File out = new File(dir, "LoreGuard-update.apk");
        if (out.exists() && !out.delete()) {
            out = new File(dir, "LoreGuard-update-" + System.currentTimeMillis() + ".apk");
        }
        try (InputStream in = conn.getInputStream(); FileOutputStream os = new FileOutputStream(out)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) os.write(buf, 0, n);
        } finally {
            conn.disconnect();
        }
        if (out.length() < 1024) throw new Exception("Downloaded file was empty");
        return out;
    }

    private void install(File apk) {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
    }

    private static boolean allowed(String url) {
        try {
            URL parsed = new URL(url);
            if (!"https".equalsIgnoreCase(parsed.getProtocol())) return false;
            String host = parsed.getHost();
            if (host == null) return false;
            host = host.toLowerCase(Locale.US);
            return host.equals("github.com")
                    || host.endsWith(".github.com")
                    || host.equals("githubusercontent.com")
                    || host.endsWith(".githubusercontent.com");
        } catch (Exception e) {
            return false;
        }
    }

    private static String message(Exception e, String fallback) {
        String text = e.getMessage();
        return text != null && !text.isEmpty() ? text : fallback;
    }
}
