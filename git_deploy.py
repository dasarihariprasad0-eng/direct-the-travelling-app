import subprocess
import os

os.chdir(r"c:\Users\Hari Prasad\Desktop\direct")

# Remove temp files if present
for f in ["git_check.py", "git_output.txt", "python-server/run_tests.py", "test_output.txt"]:
    if os.path.exists(f):
        os.remove(f)

print("Setting git remote...")
subprocess.run(["git", "remote", "set-url", "origin", "https://github.com/dasarihariprasad0-eng/direct-the-travelling-app.git"], check=True)

print("Staging files...")
subprocess.run(["git", "add", "-A"], check=True)

print("Committing changes...")
res = subprocess.run(["git", "commit", "-m", "Fix password reset email/code delivery and update application files"], capture_output=True, text=True)
print(res.stdout)
print(res.stderr)

print("Pushing to GitHub...")
push_res = subprocess.run(["git", "push", "-u", "origin", "main"], capture_output=True, text=True)
print(push_res.stdout)
print(push_res.stderr)
