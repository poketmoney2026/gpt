# GPT Customer Data Center

## Login
- User login: যেকোনো ১১ ডিজিটের BD mobile number, যা `01` দিয়ে শুরু হয়।
- Default admin number: `01741815153`
- Admin number change করতে `.env.local` এ লিখুন:

```env
ADMIN_NUMBERS=01741815153,01900000000
```

## Features
- ১ বছরের token/session login।
- User panel: package list, + button, create form, edit, delete, review status।
- Admin panel: all customer data, search/filter, used days, remaining days, expiry status, revenue stats।
- Settings: user edit/delete direct save হবে নাকি admin review panel এ যাবে।
- Review panel: edit request save/approve করা যায়, delete request remove/approve করা যায়।

## Data storage
এই version এ data `data/db.json` ফাইলে save হয়। Production এ deploy করলে MongoDB, MySQL, PostgreSQL অথবা Supabase ব্যবহার করা ভালো।

## Run
```bash
npm install
npm run dev
```
