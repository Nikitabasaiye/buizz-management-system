# Notification queue cron

Run the durable MySQL notification worker once per minute from Hostinger:

```cron
* * * * * cd /home/USERNAME/path/to/server && /usr/bin/node cron/process-notifications.js >> logs/notification-cron.log 2>&1
```

Set `NOTIFICATION_CRON_BATCH_SIZE` to control how many queued notifications one
invocation processes (default: `50`). Only one invocation should run at a time.
