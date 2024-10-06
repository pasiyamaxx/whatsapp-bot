# Simple WhatsApp By AstroX10

<p>
    Simple  bot created by AstroX10 that enhances your WhatsApp experience by automating various tasks. With this bot, you can easily manage your groups, download videos, convert files and perform utilty actions with easy.
</p>

## IMPORTANT

This project utilizes a custom server designed for efficient management of authentication state, addressing the limitations of `app state keys`, which do not automatically regenerate from `creds.json`. The server securely stores your session ID data for 48 hours, allowing ample time for retrieval, and provides a unique secret key that grants you exclusive access to download the generated session back to your bot. This functionality is achieved through the collaboration of the [Session Manager](https://github.com/AstroX10/session-manager) and [Session Generator](https://github.com/AstroX10/whatsapp-bot-session). Hosted as an open-source solution on Render, I do not have access to your data. For your security, please do not share your session ID `Access Key` with anyone, including myself, as the 48-hour data retention period serves as a safeguard against potential security breaches. This project is open source and created for the community by AstroX10, with a strong commitment to your safety and privacy. Stay safe!

## SETUP

1. Fork Your Copy
   <br>
   <a href='https://github.com/AstroX10/whatsapp-bot/fork' target="_blank"><img alt='Fork repo' src='https://img.shields.io/badge/Fork Repo-100000?style=for-the-badge&logo=scan&logoColor=white&labelColor=black&color=black'/></a>

2. Get Session ID Online Method
   <br>
   <a href='https://fxoprisa.vercel.app/' target="_blank"><img alt='SESSION ID' src='https://img.shields.io/badge/Session_id-100000?style=for-the-badge&logo=scan&logoColor=white&labelColor=black&color=black'/></a>

3. Get Session ID Local If You Don't Trust ME
   <br>
   <a href='https://github.com/AstroX10/whatsapp-bot-session' target="_blank"><img alt='SESSION ID' src='https://img.shields.io/badge/Session_id-100000?style=for-the-badge&logo=scan&logoColor=white&labelColor=black&color=black'/></a>

**Note:** You'll need to set these environment variables on every platform.

| Variable         | Description                                      |
| ---------------- | ------------------------------------------------ |
| SESSION_ID       | your session id                                  |
| HANDLERS         | put any one symbol here except @ and +           |
| WORK_TYPE        | mode public or private                           |
| BOT_INFO         | Astro,fxop;https://myimage.jpg                   |
| AUTO_READ        | make it true if you want bot to read messages    |
| AUTO_STATUS_READ | make it true if you want bot to view status      |
| SUDO             | owner number(91234567899,92336829223,9474839234) |


## License

This project is licensed under the MIT License. You are free to use, modify, and distribute the software, provided that the original license and copyright notice are included in all copies or substantial portions of the software.

### FOSSA TEST

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FAstroX10%2Fwhatsapp-bot.svg?type=shield&issueType=security)](https://app.fossa.com/projects/git%2Bgithub.com%2FAstroX10%2Fwhatsapp-bot?ref=badge_shield&issueType=security)
