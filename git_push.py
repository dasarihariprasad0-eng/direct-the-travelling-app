import subprocess
import os

os.chdir(r"c:\Users\Hari Prasad\Desktop\direct")
subprocess.run(["git", "remote", "set-url", "origin", "https://github.com/dasarihariprasad0-eng/direct-the-travelling-app.git"], check=True)
subprocess.run(["git", "add", "."], check=True)
res = subprocess.run(["git", "commit", "-m", "Fix password reset: keep reset code valid and log/print code on SMTP failure or unconfigured state"], capture_output=True, text=True)
print("Commit output:", res.stdout, res.stderr)
push_res = subprocess.run(["git", "push", "-u", "origin", "main"], capture_output=True, text=True)
print("Push output:", push_res.stdout, push_res.stderr)
with open("git_push_result.txt", "w", encoding="utf-8") as f:
    f.write(f"Commit: {res.stdout}\n{res.stderr}\nPush: {push_res.stdout}\n{push_res.stderr}")
