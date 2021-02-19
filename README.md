# Network healthcheck

When running health checks the --slackBotToken must be specified. The token is the OAuth token for the Slack App that is used for notifications.slackBotToken

Running in pm2:

resends:

``` pm2 start src/realtime-healthcheck.js -- --slackBotToken 'TOKEN_HERE' ```


real-time:

``` pm2 start src/resend-healthcheck.js -- --slackBotToken 'TOKEN_HERE' ```
