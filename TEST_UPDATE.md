# Testing Auto-Update

## Step 1: Install Version 1.1.9

### On Linux:
```bash
# Option 1: Run AppImage directly
./release/1.1.9/Wasla\ Management-Linux-1.1.9.AppImage

# Option 2: Install DEB package
sudo dpkg -i release/1.1.9/Wasla\ Management-Linux-1.1.9.deb
```

### On Windows:
Run: `release/1.1.9/Wasla Management-Windows-1.1.9-Setup.exe`

## Step 2: Verify Current Version

1. Open the app
2. Check the version in the UpdateStatus component (should show v1.1.9)
3. Wait 5 seconds - the app will automatically check for updates

## Step 3: Publish Version 1.2.0

```bash
export GH_TOKEN=your_github_token_here
npm run build:publish
```

This will:
- Build version 1.2.0 for Linux and Windows
- Create a GitHub release
- Upload all files

## Step 4: Test Update Detection

1. With version 1.1.9 running, wait for automatic check (5 seconds after startup, or every 4 hours)
2. OR click "Vérifier mise à jour" button manually
3. You should see:
   - "v1.2.0 disponible" message
   - "Télécharger" button
4. Click "Télécharger" to download the update
5. Once downloaded, click "Redémarrer" to install

## Expected Behavior

- ✅ Version 1.1.9 detects update 1.2.0
- ✅ Download progress bar appears
- ✅ "Prêt à installer" message when download completes
- ✅ App restarts with new version after clicking "Redémarrer"

## Troubleshooting

If update is not detected:
1. Check GitHub release exists: https://github.com/N3on404/wasla_management-/releases
2. Verify `latest.yml` or `latest-linux.yml` files are in the release
3. Check console logs for errors
4. Ensure `GH_TOKEN` is set correctly when publishing

