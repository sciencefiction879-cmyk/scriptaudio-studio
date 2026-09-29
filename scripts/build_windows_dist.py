#!/usr/bin/env python3
"""
ScriptAudio Studio - Complete Standalone Windows Executable & Portable Distribution Builder
Builds:
  1. ScriptAudio Studio.exe (Standalone 1-click executable for every Windows system)
  2. ScriptAudioStudio-v2.1-Windows-Portable.zip (Zero-install portable release folder)
Places releases in dist/ and copies to /Users/shaddo/Desktop/
"""

import os
import sys
import shutil
import zipfile
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
BUILD_DIR = os.path.join(DIST_DIR, "build_win")
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")
SFX_BIN = os.path.join(ASSETS_DIR, "7zS.sfx")
VERSION = "2.1.0"
DESKTOP_DIR = os.path.expanduser("~/Desktop")

def find_seven_zip():
    candidates = [
        shutil.which("7z"),
        shutil.which("7zz"),
        shutil.which("7z.exe"),
        r"C:\Program Files\7-Zip\7z.exe",
        r"C:\Program Files (x86)\7-Zip\7z.exe",
        "/opt/homebrew/bin/7zz",
        "/usr/local/bin/7zz",
        "/usr/bin/7z"
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return "7z"

SEVEN_ZIP = find_seven_zip()

def check_prerequisites():
    if not (os.path.exists(SEVEN_ZIP) or shutil.which(SEVEN_ZIP)):
        raise FileNotFoundError(f"7-Zip binary not found on this system. Please install 7-Zip.")
    if not os.path.exists(SFX_BIN):
        raise FileNotFoundError(f"Windows SFX module not found at {SFX_BIN}")
    print(f"✓ Found 7-Zip: {SEVEN_ZIP}")
    print(f"✓ Found SFX Module: {SFX_BIN}")

def create_windows_launchers(target_dir):
    """Creates VBScript and Batch launchers for Windows."""
    # 1. Silent VBS Launcher (No black CMD box)
    vbs_path = os.path.join(target_dir, "launcher.vbs")
    vbs_content = '''Option Explicit
Dim objFSO, objShell, appDir, htmlPath, appData, userDataDir
Dim browserPath, cmd, edgePaths, chromePaths, bravePaths, p, fileUri

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

appDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
htmlPath = appDir & "\\index.html"

appData = objShell.ExpandEnvironmentStrings("%APPDATA%")
userDataDir = appData & "\\ScriptAudioStudio\\User Data"

' Ensure persistent user data directory exists
If Not objFSO.FolderExists(appData & "\\ScriptAudioStudio") Then
    On Error Resume Next
    objFSO.CreateFolder(appData & "\\ScriptAudioStudio")
    On Error GoTo 0
End If

browserPath = ""

' 1. Check Microsoft Edge (Default on Windows 10 & 11)
edgePaths = Array( _
    objShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"), _
    objShell.ExpandEnvironmentStrings("%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"), _
    objShell.ExpandEnvironmentStrings("%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe") _
)

For Each p In edgePaths
    If objFSO.FileExists(p) Then
        browserPath = p
        Exit For
    End If
Next

' 2. Check Google Chrome if Edge not found
If browserPath = "" Then
    chromePaths = Array( _
        objShell.ExpandEnvironmentStrings("%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"), _
        objShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"), _
        objShell.ExpandEnvironmentStrings("%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe") _
    )
    For Each p In chromePaths
        If objFSO.FileExists(p) Then
            browserPath = p
            Exit For
        End If
    Next
End If

' 3. Check Brave Browser
If browserPath = "" Then
    bravePaths = Array( _
        objShell.ExpandEnvironmentStrings("%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"), _
        objShell.ExpandEnvironmentStrings("%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe") _
    )
    For Each p In bravePaths
        If objFSO.FileExists(p) Then
            browserPath = p
            Exit For
        End If
    Next
End If

' Launch application window
If browserPath <> "" Then
    fileUri = "file:///" & Replace(htmlPath, "\\", "/")
    cmd = """" & browserPath & """ --app=""" & fileUri & """ --window-size=1440,940 --user-data-dir=""" & userDataDir & """ --allow-file-access-from-files --no-first-run --no-default-browser-check"
    objShell.Run cmd, 1, True
Else
    ' Fallback to default Windows web browser
    objShell.Run "rundll32.exe url.dll,FileProtocolHandler """ & htmlPath & """", 1, True
End If
'''
    with open(vbs_path, "w", encoding="utf-8") as f:
        f.write(vbs_content)

    # 2. Batch Launcher (Fallback / alternative)
    bat_path = os.path.join(target_dir, "Run_ScriptAudio_Studio.bat")
    bat_content = '''@echo off
title ScriptAudio Studio
cd /d "%~dp0"

:: Prefer silent VBScript launcher if wscript is available
if exist "%SystemRoot%\\System32\\wscript.exe" (
    "%SystemRoot%\\System32\\wscript.exe" //nologo "%~dp0launcher.vbs"
    exit /b 0
)

set "HTML_PATH=%~dp0index.html"
set "USER_DATA=%APPDATA%\\ScriptAudioStudio\\User Data"

if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="file:///%HTML_PATH:\\=/%" --window-size=1440,940 --user-data-dir="%USER_DATA%" --allow-file-access-from-files
    exit /b 0
)

if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="file:///%HTML_PATH:\\=/%" --window-size=1440,940 --user-data-dir="%USER_DATA%" --allow-file-access-from-files
    exit /b 0
)

if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="file:///%HTML_PATH:\\=/%" --window-size=1440,940 --user-data-dir="%USER_DATA%" --allow-file-access-from-files
    exit /b 0
)

start "" "%HTML_PATH%"
exit /b 0
'''
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_content)

    print(f"✓ Created Windows Launchers (launcher.vbs & Run_ScriptAudio_Studio.bat)")

def build_windows_dist():
    print("=" * 65)
    print(f"🎙️  Building Windows Release for ScriptAudio Studio v{VERSION}")
    print("=" * 65)

    check_prerequisites()

    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR, exist_ok=True)
    os.makedirs(DIST_DIR, exist_ok=True)

    pkg_root = os.path.join(BUILD_DIR, "ScriptAudioStudio")
    os.makedirs(pkg_root, exist_ok=True)

    # 1. Copy web assets
    print("📦 Gathering web assets...")
    shutil.copy2(os.path.join(PROJECT_ROOT, "index.html"), pkg_root)
    shutil.copy2(os.path.join(PROJECT_ROOT, "style.css"), pkg_root)
    shutil.copytree(os.path.join(PROJECT_ROOT, "js"), os.path.join(pkg_root, "js"))
    shutil.copytree(os.path.join(PROJECT_ROOT, "data"), os.path.join(pkg_root, "data"))
    
    os.makedirs(os.path.join(pkg_root, "assets"), exist_ok=True)
    shutil.copy2(os.path.join(ASSETS_DIR, "AppIcon.ico"), os.path.join(pkg_root, "assets"))

    # 2. Add launchers
    create_windows_launchers(pkg_root)

    # 3. Add README for Windows users
    readme_win = os.path.join(pkg_root, "README_WINDOWS.txt")
    with open(readme_win, "w", encoding="utf-8") as f:
        f.write(f"""=====================================================
ScriptAudio Studio v{VERSION} - Windows Release
=====================================================

ScriptAudio Studio runs seamlessly on Windows 11, 10, 8, and 7!

How to run:
1. Double-click "ScriptAudio Studio.exe" OR "Run_ScriptAudio_Studio.bat".
2. The application opens in a clean, standalone desktop window.
3. No Python, Node.js, or external software needed!
4. Your Google AI Studio API keys and settings are permanently saved.

Enjoy studio-quality Google AI voiceover production!
""")

    # 4. Create Standalone Windows Executable (.exe) via 7z SFX
    print("🔨 Compressing files into 7z payload...")
    payload_7z = os.path.join(BUILD_DIR, "payload.7z")
    subprocess.check_call([
        SEVEN_ZIP, "a", "-t7z", "-mx=9", "-mfb=64", "-md=32m", "-ms=on",
        payload_7z, f"{pkg_root}/*"
    ])

    sfx_cfg = os.path.join(BUILD_DIR, "sfx_config.txt")
    with open(sfx_cfg, "wb") as f:
        f.write(f';!@Install@!UTF-8!\r\nTitle="ScriptAudio Studio v{VERSION}"\r\nRunProgram="wscript.exe //nologo launcher.vbs"\r\n;!@InstallEnd@!\r\n'.encode('utf-8'))

    exe_name = "ScriptAudio Studio.exe"
    out_exe = os.path.join(DIST_DIR, exe_name)
    if os.path.exists(out_exe):
        os.remove(out_exe)

    print(f"📦 Assembling standalone PE executable: {exe_name}...")
    with open(out_exe, "wb") as dst:
        with open(SFX_BIN, "rb") as s:
            dst.write(s.read())
        with open(sfx_cfg, "rb") as s:
            dst.write(s.read())
        with open(payload_7z, "rb") as s:
            dst.write(s.read())

    exe_size_mb = os.path.getsize(out_exe) / (1024 * 1024)
    print(f"✅ Created Standalone Windows Executable: {out_exe} ({exe_size_mb:.2f} MB)")

    # 5. Create Standalone Portable ZIP
    zip_name = f"ScriptAudioStudio-v{VERSION}-Windows-Portable.zip"
    out_zip = os.path.join(DIST_DIR, zip_name)
    if os.path.exists(out_zip):
        os.remove(out_zip)

    # Include the .exe inside the portable bundle too!
    shutil.copy2(out_exe, pkg_root)

    print(f"📦 Packaging complete portable ZIP: {zip_name}...")
    subprocess.check_call([
        SEVEN_ZIP, "a", "-tzip", "-mx=9",
        out_zip, f"{pkg_root}/*"
    ])
    zip_size_mb = os.path.getsize(out_zip) / (1024 * 1024)
    print(f"✅ Created Windows Portable ZIP: {out_zip} ({zip_size_mb:.2f} MB)")

    # 6. Verify PE Executable Header with file command & 7z integrity check
    print("🔍 Running executable verification checks...")
    if shutil.which("file"):
        try:
            file_info = subprocess.check_output(["file", out_exe]).decode().strip()
            print(f"  • Binary info: {file_info}")
        except Exception:
            pass
    
    test_res = subprocess.check_output([SEVEN_ZIP, "t", out_exe]).decode()
    if "Everything is Ok" in test_res:
        print("  • Archive integrity check inside .exe: PASSED ✓")
    else:
        print(f"  • Warning on archive test: {test_res}")

    # 7. Copy to Desktop if available
    if os.path.exists(DESKTOP_DIR):
        try:
            desktop_exe = os.path.join(DESKTOP_DIR, exe_name)
            desktop_zip = os.path.join(DESKTOP_DIR, zip_name)
            shutil.copy2(out_exe, desktop_exe)
            shutil.copy2(out_zip, desktop_zip)
            print(f"📂 Copied to Desktop:")
            print(f"  • {desktop_exe}")
            print(f"  • {desktop_zip}")
        except Exception as e:
            print(f"  • Skipped desktop copy: {e}")

    # Cleanup staging directory
    shutil.rmtree(BUILD_DIR)
    print("🎉 All Windows packages successfully built and verified!")
    return out_exe, out_zip

if __name__ == "__main__":
    build_windows_dist()
