const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

document.getElementById('fileInput').addEventListener('change', function() {
    const preview = document.getElementById('file-name-preview');
    if (this.files.length > 0) {
        preview.textContent = `📎 Выбран файл: ${this.files[0].name}`;
    } else {
        preview.textContent = '';
    }
});

document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMessage');

    submitBtn.disabled = true;
    statusMsg.className = "status-msg";
    statusMsg.textContent = "Отправка заявки исполнителям...";

    const tech = document.querySelector('input[name="tech"]:checked').value;
    const date = document.getElementById('date').value;
    const duration = document.getElementById('duration').value;
    const username = document.getElementById('username').value;
    const comment = document.getElementById('comment').value;
    const fileInput = document.getElementById('fileInput');

    const messageText = 
`📋 **НОВАЯ ЗАЯВКА НА ТЕХНИКУ**
━━━━━━━━━━━━━━━
⚙️ **Техника:** ${tech}
📅 **Когда:** ${date}
⏳ **На сколько:** ${duration}
👤 **Заказчик:** ${username}
━━━━━━━━━━━━━━━
📝 **Задача и ТЗ:**
${comment}`;

    try {
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('chat_id', ADMIN_ID);
            formData.append('document', fileInput.files[0]);
            formData.append('caption', messageText);
            formData.append('parse_mode', 'Markdown');

            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Ошибка отправки файла');

        } else {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_ID,
                    text: messageText,
                    parse_mode: 'Markdown'
                })
            });

            if (!response.ok) throw new Error('Ошибка отправки текста');
        }

        statusMsg.className = "status-msg success";
        statusMsg.textContent = "✅ Заявка успешно доставлена постановщику задач!";
        document.getElementById('orderForm').reset();
        document.getElementById('file-name-preview').textContent = '';

    } catch (error) {
        console.error(error);
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "❌ Ошибка сети. Не удалось передать данные.";
    } finally {
        submitBtn.disabled = false;
    }
});
