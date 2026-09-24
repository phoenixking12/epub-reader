package com.loreguard.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

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
                String blocked = blockReason(apk);
                if (blocked != null) {
                    call.reject(blocked);
                    return;
                }
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

    /**
     * Android reports "package conflicts with an existing package" when the new
     * APK is signed with a different certificate, or when its versionCode is not
     * higher. Explain that here instead of opening an installer that will fail.
     */
    private String blockReason(File apk) {
        PackageInfo incoming = archiveInfo(apk);
        if (incoming == null || incoming.packageName == null) {
            return "Downloaded file is not an Android app";
        }
        String ours = getContext().getPackageName();
        if (!ours.equals(incoming.packageName)) return "That download is a different app";
        PackageInfo installed;
        try {
            installed = installedInfo(ours);
        } catch (PackageManager.NameNotFoundException e) {
            return null;
        }
        if (versionCode(incoming) <= versionCode(installed)) {
            return "That download is not a newer LoreGuard build";
        }
        if (!sameSigning(installed, apk)) {
            return signatureMismatchMessage(apk);
        }
        return null;
    }

    private String signatureMismatchMessage(File apk) {
        String saved = saveForReinstall(apk);
        if (saved != null) {
            return "Android can't replace this install because the update is signed with a different key. "
                    + "The new app was saved to Downloads as LoreGuard-update.apk. "
                    + "Back up your library, uninstall LoreGuard, then open that file. "
                    + "After this install, updates keep your library.";
        }
        return "Android can't replace this install because the update is signed with a different key. "
                + "Back up your library, uninstall LoreGuard, then install the latest release from GitHub. "
                + "After that, updates keep your library.";
    }

    private String saveForReinstall(File apk) {
        try {
            if (Build.VERSION.SDK_INT >= 29) return saveToMediaStore(apk);
            return saveToPublicDownloads(apk);
        } catch (Exception e) {
            return null;
        }
    }

    @androidx.annotation.RequiresApi(29)
    private String saveToMediaStore(File apk) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        String name = "LoreGuard-update.apk";
        try {
            resolver.delete(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    MediaStore.Downloads.DISPLAY_NAME + "=?",
                    new String[] {name});
        } catch (Exception ignored) {
            // A leftover row should not block saving a new copy.
        }
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, name);
        values.put(MediaStore.Downloads.MIME_TYPE, "application/vnd.android.package-archive");
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.Downloads.IS_PENDING, 1);
        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) return null;
        try (InputStream in = new FileInputStream(apk); OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) return null;
            copy(in, out);
        } catch (Exception e) {
            resolver.delete(uri, null, null);
            throw e;
        }
        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        resolver.update(uri, values, null, null);
        return name;
    }

    private String saveToPublicDownloads(File apk) throws Exception {
        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!dir.exists() && !dir.mkdirs()) return null;
        File dest = new File(dir, "LoreGuard-update.apk");
        try (InputStream in = new FileInputStream(apk); OutputStream out = new FileOutputStream(dest)) {
            copy(in, out);
        }
        return dest.getAbsolutePath();
    }

    private static void copy(InputStream in, OutputStream out) throws Exception {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
    }

    private PackageInfo archiveInfo(File apk) {
        PackageManager pm = getContext().getPackageManager();
        String path = apk.getAbsolutePath();
        if (Build.VERSION.SDK_INT >= 33) {
            return pm.getPackageArchiveInfo(path, PackageManager.PackageInfoFlags.of(0));
        }
        return pm.getPackageArchiveInfo(path, 0);
    }

    private PackageInfo installedInfo(String packageName) throws PackageManager.NameNotFoundException {
        PackageManager pm = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28
                ? PackageManager.GET_SIGNING_CERTIFICATES
                : PackageManager.GET_SIGNATURES;
        if (Build.VERSION.SDK_INT >= 33) {
            return pm.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(flags));
        }
        return pm.getPackageInfo(packageName, flags);
    }

    private static long versionCode(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= 28) return info.getLongVersionCode();
        return info.versionCode;
    }

    private boolean sameSigning(PackageInfo installed, File apk) {
        List<byte[]> incoming = archiveCerts(apk);
        Signature[] current = signers(installed);
        if (incoming.isEmpty() || current == null || current.length == 0) return true;
        if (incoming.size() != current.length) return false;
        boolean[] used = new boolean[current.length];
        for (byte[] cert : incoming) {
            boolean found = false;
            for (int i = 0; i < current.length; i++) {
                if (used[i]) continue;
                if (MessageDigest.isEqual(cert, current[i].toByteArray())) {
                    used[i] = true;
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    private static Signature[] signers(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= 28 && info.signingInfo != null) {
            Signature[] current = info.signingInfo.getApkContentsSigners();
            if (current != null && current.length > 0) return current;
        }
        return info.signatures;
    }

    private static List<byte[]> archiveCerts(File apk) {
        List<byte[]> certs = new ArrayList<>();
        ZipFile zip = null;
        try {
            zip = new ZipFile(apk);
            CertificateFactory factory = CertificateFactory.getInstance("X.509");
            Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName();
                if (!name.startsWith("META-INF/") || entry.isDirectory()) continue;
                String upper = name.toUpperCase(Locale.US);
                if (!upper.endsWith(".RSA") && !upper.endsWith(".DSA") && !upper.endsWith(".EC")) continue;
                try (InputStream in = zip.getInputStream(entry)) {
                    for (Certificate cert : factory.generateCertificates(in)) {
                        certs.add(cert.getEncoded());
                    }
                }
            }
        } catch (Exception ignored) {
            certs.clear();
        } finally {
            if (zip != null) {
                try {
                    zip.close();
                } catch (Exception ignored) {
                    // The caller treats an empty list as "let the installer decide".
                }
            }
        }
        return certs;
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
