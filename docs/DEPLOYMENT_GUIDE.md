# Enterprise LAN Deployment & Security Guide

## Network Topology Overview

The File Server System is designed for high-performance deployment across local area networks (LANs).

```
 ┌────────────────────────────────────────────────────────┐
 │                   Central Server Host                  │
 │                                                        │
 │  ┌──────────────────────┐    ┌──────────────────────┐  │
 │  │  Express REST API    │    │ PostgreSQL Database  │  │
 │  │  (Port 5000 / 0.0.0.0│    │ (Port 5432)          │  │
 │  └──────────┬───────────┘    └──────────┬───────────┘  │
 │             │                           │              │
 │             └─────────────┬─────────────┘              │
 │                           │                            │
 └───────────────────────────┼────────────────────────────┘
                             │
            Local Area Network (LAN 192.168.x.x)
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
┌────┴───────────────┐ ┌─────┴──────────────┐ ┌──────┴──────────────┐
│ Windows Desktop    │ │ Linux Desktop      │ │ Windows Desktop    │
│ Client (Client #1) │ │ Client (Client #2) │ │ Client (Client #3) │
└────────────────────┘ └────────────────────┘ └────────────────────┘
```

## Security Best Practices

1. **Firewall Rules**: Ensure incoming connections on Port `5000` (HTTP & WebSockets) are permitted on the central host firewall:
   - **Windows Firewall**: Add inbound rule for Port `5000` TCP.
   - **Linux UFW**: Run `sudo ufw allow 5000/tcp`.

2. **Storage Partitioning**: Allocate dedicated disk storage for `/server/storage/` with sufficient I/O performance (SSD RAID array recommended for enterprise concurrency).

3. **Data Integrity & Backups**: Run daily PostgreSQL dump backups:
   ```bash
   pg_dump -U postgres fileserver > backup_$(date +%Y%m%d).sql
   ```
