# Notification catalogue (phase 1)

Every message the app or the CRM sends to a customer: when it fires, through which channel, and the text in Persian, German and Russian. `{curly}` parts are filled in by the notification service. All texts are short enough for a lock screen (title up to about 40 characters, body up to about 110).

Channels: **Push** (Firebase, Android + iOS), **Email** (the email API), **In-app** (the bell list in the app). WhatsApp is not used for now.

Rules:
- One notification per event. No reminders for something the customer already did.
- Service messages (deadlines, replies, documents, requests) are on by default. **Offers and campaigns need the customer's opt-in** (Profile, "notifications for offers"); without it they appear only inside the app.
- Quiet hours: push between 21:00 and 8:00 is held until 8:00 (German time), except the sign-in code.
- Tapping a push opens the exact screen named in the "Opens" column.
- Every text repeats a promise only where it fits naturally; never add "free" to a security message.

| # | Event | When | Channels | Opens |
|---|---|---|---|---|
| 1 | Cancellation window | 30 days before the cancellation deadline, if a cheaper option exists | Push, Email, In-app | Offers for that contract |
| 2 | Deadline soon | 7 days before the cancellation deadline, if the customer has not answered | Push, In-app | Contract detail |
| 3 | Advisor replied | A staff message in a contract conversation | Push, In-app | That contract's chat |
| 4 | Request update | A request (ticket) changes status | Push, In-app | That contract's requests |
| 5 | Document from Tarefe | Staff file a document for the customer (confirmation, policy, bill) | Push, In-app | Documents |
| 6 | Document needed | Staff ask the customer for a file | Push, Email, In-app | That contract's chat |
| 7 | Contract added | A contract the customer sent is checked and added | Push, In-app | Contract detail |
| 8 | Better offer | The CRM finds a lower price for the customer's situation (opt-in only) | Push, In-app | Offers |
| 9 | Referral progress | Friend signed / voucher sent | Push, In-app | Profile |
| 10 | Sign-in code | Customer asks to sign in | Email only | (the code) |
| 11 | New device | First sign-in on a new phone | Email | Profile, security |

## Texts

### 1. Cancellation window
- **fa** — عنوان: «{service} تو قابل فسخ است» · متن: «تا {date} می‌توانی فسخ کنی. یک گزینه ارزان‌تر پیدا کرده‌ایم: حدود {saving} یورو کمتر در سال.»
- **de** — Titel: „Ihr {service}-Vertrag ist kündbar“ · Text: „Sie können bis {date} kündigen. Wir haben eine günstigere Option gefunden: etwa {saving} € weniger im Jahr.“
- **ru** — Заголовок: «Договор {service} можно расторгнуть» · Текст: «Расторгнуть можно до {date}. Мы нашли вариант дешевле: примерно на {saving} € в год.»

### 2. Deadline soon
- **fa** — «۷ روز تا مهلت فسخ {service}» · «اگر می‌خواهی تعرفه ارزان‌تر را بگیری، تا {date} به ما خبر بده. بقیه کارها با ما.»
- **de** — „Noch 7 Tage bis zur Kündigungsfrist“ · „Wenn Sie zum günstigeren Tarif wechseln möchten, sagen Sie uns bis {date} Bescheid. Den Rest erledigen wir.“
- **ru** — «7 дней до срока расторжения» · «Если хотите перейти на более дешёвый тариф, сообщите нам до {date}. Остальное сделаем мы.»

### 3. Advisor replied
- **fa** — «پیام تازه از {advisor}» · «درباره {service} · {provider}: {first_words}»
- **de** — „Neue Nachricht von {advisor}“ · „Zu {service} · {provider}: {first_words}“
- **ru** — «Новое сообщение от {advisor}» · «По договору {service} · {provider}: {first_words}»

### 4. Request update
- **fa** — «درخواست {ticket}: {status}» · «{topic} برای {service} · {provider}»
- **de** — „Anfrage {ticket}: {status}“ · „{topic} für {service} · {provider}“
- **ru** — «Запрос {ticket}: {status}» · «{topic} по договору {service} · {provider}»
- Status words: registered = ثبت شد / Eingegangen / Принят · in progress = در حال انجام / In Bearbeitung / В работе · done = انجام شد / Erledigt / Выполнен

### 5. Document from Tarefe
- **fa** — «مدرک تازه: {document}» · «در بخش مدارک، کنار {service} · {provider} ذخیره شد.»
- **de** — „Neues Dokument: {document}“ · „Gespeichert unter Dokumente, bei {service} · {provider}.“
- **ru** — «Новый документ: {document}» · «Сохранён в разделе «Документы», рядом с {service} · {provider}.»

### 6. Document needed
- **fa** — «{advisor} یک مدرک لازم دارد» · «برای {service}: {document}. عکس یا PDF را در گفتگو بفرست.»
- **de** — „{advisor} braucht ein Dokument“ · „Für {service}: {document}. Senden Sie ein Foto oder PDF im Chat.“
- **ru** — «{advisor} нужен документ» · «Для {service}: {document}. Отправьте фото или PDF в чате.»

### 7. Contract added
- **fa** — «{service} · {provider} اضافه شد» · «قراردادت بررسی شد و حالا در فهرست قراردادهایت است.»
- **de** — „{service} · {provider} hinzugefügt“ · „Wir haben Ihren Vertrag geprüft. Er steht jetzt in Ihrer Vertragsliste.“
- **ru** — «{service} · {provider} добавлен» · «Мы проверили договор, теперь он в вашем списке.»

### 8. Better offer (opt-in)
- **fa** — «قیمت کمتر برای {service}» · «بر اساس شرایط تو، حدود {saving} یورو در سال کمتر. مشاوره و تغییر رایگان است.»
- **de** — „Günstiger für {service}“ · „Passend zu Ihrer Situation etwa {saving} € weniger im Jahr. Beratung und Wechsel sind kostenlos.“
- **ru** — «Дешевле для {service}» · «С учётом ваших условий примерно на {saving} € в год меньше. Консультация и переход бесплатны.»

### 9. Referral progress
- Friend signed — **fa** «{friend} قراردادش را امضا کرد» · «اگر تا ۱۴ روز فسخ نکند، کارت هدیه ۱۰ یورویی برایت فرستاده می‌شود.» — **de** „{friend} hat unterschrieben“ · „Wenn der Vertrag 14 Tage bestehen bleibt, erhalten Sie einen 10-€-Gutschein.“ — **ru** «{friend} подписал(а) договор» · «Если договор продержится 14 дней, вы получите подарочную карту на 10 €.»
- Voucher sent — **fa** «کارت هدیه ۱۰ یورویی تو آماده است» · «ممنون که تعرفه را به {friend} معرفی کردی.» — **de** „Ihr 10-€-Gutschein ist da“ · „Danke, dass Sie Tarefe an {friend} empfohlen haben.“ — **ru** «Ваша подарочная карта на 10 € готова» · «Спасибо, что порекомендовали Tarefe: {friend}.»

### 10. Sign-in code (email)
- **fa** — موضوع: «کد ورود تو: {code}» · متن: «این کد ۱۰ دقیقه معتبر است. اگر خودت درخواست نکرده‌ای، این ایمیل را نادیده بگیر.»
- **de** — Betreff: „Ihr Anmeldecode: {code}“ · „Der Code gilt 10 Minuten. Wenn Sie ihn nicht angefordert haben, ignorieren Sie diese E-Mail.“
- **ru** — Тема: «Ваш код для входа: {code}» · «Код действует 10 минут. Если вы его не запрашивали, просто проигнорируйте это письмо.»

### 11. New device (email)
- **fa** — «ورود از یک گوشی جدید» · «در {time} با {device} وارد حسابت شدی. اگر خودت نبودی، از بخش پروفایل همه دستگاه‌ها را خارج کن یا به مشاورت خبر بده.»
- **de** — „Anmeldung auf einem neuen Gerät“ · „Am {time} wurde sich mit {device} angemeldet. Waren Sie das nicht, melden Sie im Profil alle Geräte ab oder informieren Sie Ihre Beraterin.“
- **ru** — «Вход с нового устройства» · «{time} выполнен вход с {device}. Если это были не вы, выйдите на всех устройствах в профиле или сообщите консультанту.»

Native speakers should review the German and Russian texts before release.
