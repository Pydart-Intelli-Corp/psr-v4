# FTP Server Setup Guide
**Server:** 168.231.121.19  
**Port:** 21  
**Username:** ftpuser  
**Password:** psr@2026

---

## Problem: SSH Connection Resets
Your SSH connection is being reset during key exchange. This is likely due to:
- SSH connection limits (MaxStartups)
- fail2ban blocking repeated attempts
- Firewall rules
- SSH daemon needs restart

---

## 🚀 Quick Setup - Choose ONE Method

### Method 1: Direct Server Access ⭐ **RECOMMENDED**
Access your server through:
- **VPS Control Panel** (e.g., DigitalOcean Console, Linode LISH, Vultr Console)
- **Physical access** (if local server)
- **IPMI/iLO** (for dedicated servers)
- **Hosting provider's web console**

Then run these commands:

```bash
# Install FTP server
apt update && apt install -y vsftpd

# Create FTP user
useradd -m -s /bin/bash ftpuser
echo "ftpuser:psr@2026" | chpasswd

# Setup directories
mkdir -p /home/ftpuser/ftp/upload
chown nobody:nogroup /home/ftpuser/ftp
chmod a-w /home/ftpuser/ftp
chown ftpuser:ftpuser /home/ftpuser/ftp/upload

# Configure vsftpd
cat > /etc/vsftpd.conf <<'EOF'
listen=YES
listen_ipv6=NO
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
chroot_local_user=YES
allow_writeable_chroot=YES
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=40100
pasv_address=168.231.121.19
userlist_enable=YES
userlist_file=/etc/vsftpd.userlist
userlist_deny=NO
xferlog_enable=YES
use_localtime=YES
EOF

# Add user to allowed list
echo "ftpuser" > /etc/vsftpd.userlist

# Configure firewall
ufw allow 21/tcp
ufw allow 40000:40100/tcp
ufw reload

# Start FTP service
systemctl restart vsftpd
systemctl enable vsftpd
systemctl status vsftpd
```

---

### Method 2: Use Pre-made Script
If you can eventually SSH in:

```powershell
# From PowerShell on Windows
.\setup-ftp-helper.ps1
```

Or manually upload `setup-ftp.sh` to server and run:
```bash
bash setup-ftp.sh
```

---

### Method 3: Fix SSH First (Optional)
If you want to fix SSH connection issues:

```bash
# On your server, run:
# Edit SSH config
nano /etc/ssh/sshd_config

# Add or modify these lines:
MaxStartups 30:100:60
MaxSessions 20
ClientAliveInterval 120
ClientAliveCountMax 3

# Restart SSH
systemctl restart sshd

# Check fail2ban (if installed)
fail2ban-client status
fail2ban-client set sshd unbanip 192.168.1.88  # Your IP
```

---

## 🧪 Test FTP Connection

### Option 1: PowerShell Test Script
```powershell
.\test-ftp.ps1
```

### Option 2: Windows FTP Client
```cmd
ftp 168.231.121.19
# Username: ftpuser
# Password: psr@2026
```

### Option 3: PowerShell Direct Test
```powershell
Test-NetConnection -ComputerName 168.231.121.19 -Port 21
```

### Option 4: Web Browser
```
ftp://ftpuser:psr@2026@168.231.121.19
```

---

## 📁 FTP Clients (Recommended)

### FileZilla
- **Host:** 168.231.121.19
- **Port:** 21
- **Protocol:** FTP
- **Username:** ftpuser
- **Password:** psr@2026

### WinSCP
- **Protocol:** FTP
- **Host:** 168.231.121.19
- **Port:** 21
- **Username:** ftpuser
- **Password:** psr@2026

---

## 🔧 Troubleshooting

### FTP Port Not Open
```bash
# Check if vsftpd is running
systemctl status vsftpd

# Start if not running
systemctl start vsftpd

# Check firewall
ufw status
ufw allow 21/tcp
```

### Connection Timeout
```bash
# Check if service is listening
netstat -tuln | grep :21

# Check logs
tail -f /var/log/vsftpd.log
tail -f /var/log/syslog | grep vsftpd
```

### Authentication Failed
```bash
# Verify user exists
id ftpuser

# Reset password
echo "ftpuser:psr@2026" | chpasswd

# Check user is in allowed list
cat /etc/vsftpd.userlist
```

### Permission Issues
```bash
# Fix permissions
chown ftpuser:ftpuser /home/ftpuser/ftp/upload
chmod 755 /home/ftpuser/ftp/upload
```

---

## 📊 Check FTP Status

```bash
# Service status
systemctl status vsftpd

# Check connections
netstat -an | grep :21

# View logs
journalctl -u vsftpd -f

# Test from server itself
ftp localhost
```

---

## 🔐 Security Notes

### Current Setup
- ✅ No anonymous access
- ✅ Users chrooted to home directory  
- ✅ Userlist enabled
- ⚠️ Unencrypted FTP (port 21)

### To Enable FTPS (Encrypted)
```bash
# Generate SSL certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/vsftpd.pem \
  -out /etc/ssl/private/vsftpd.pem

# Edit /etc/vsftpd.conf
ssl_enable=YES
rsa_cert_file=/etc/ssl/private/vsftpd.pem
rsa_private_key_file=/etc/ssl/private/vsftpd.pem
force_local_logins_ssl=YES
force_local_data_ssl=YES

# Restart
systemctl restart vsftpd
```

---

## 📝 Quick Reference

| Item | Value |
|------|-------|
| **Server IP** | 168.231.121.19 |
| **FTP Port** | 21 |
| **Passive Ports** | 40000-40100 |
| **Username** | ftpuser |
| **Password** | psr@2026 |
| **Home Directory** | /home/ftpuser |
| **Upload Directory** | /home/ftpuser/ftp/upload |
| **Config File** | /etc/vsftpd.conf |
| **Log File** | /var/log/vsftpd.log |

---

## Need Help?

1. **Check service status:**
   ```bash
   systemctl status vsftpd
   ```

2. **View real-time logs:**
   ```bash
   journalctl -u vsftpd -f
   ```

3. **Test from Windows:**
   ```powershell
   Test-NetConnection -ComputerName 168.231.121.19 -Port 21
   ```

---

**Created:** 2026-02-14  
**For:** PSR-V4 Project  
