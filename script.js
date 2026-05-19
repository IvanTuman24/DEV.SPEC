const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// База Telegram-аккаунтов твоей команды (все собаки на месте, опечатки убраны)
const tgUsernames = {
    "Женя Борода": "@Happiness091",
    "Влад": "@free8from",
    "Ник": "@fyrfyrmoscow",
    "Никита": "@Shmn32",
    "Алёна Грибова": "@alionagrib",
    "Нася You": "@youjwllr",
    "Натали": "@ntlngvtsn"
};

// Выставление сегодняшней даты в календарь по умолчанию
document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1; 
        let dd = today.getDate();

        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;

        const formattedToday = `${yyyy}-${mm}-${dd}`;
        dateInput.value = formattedToday; 
        dateInput.min = formattedToday;   
    }
});

const usernameSelect = document.getElementById('usernameSelect');
const customUsernameInput = document.getElementById('customUsername');

if (usernameSelect) {
    usernameSelect.addEventListener('change', function() {
        if (this.value === 'Иначе') {
            customUsernameInput.style.display = 'block';
            customUsernameInput.required = true;
        } else {
            customUsernameInput.style.display = 'none';
            customUsernameInput.required = false;
            customUsernameInput.value = ''; 
        }
    });
}

const fileInput = document.getElementById('fileInput');
if (fileInput) {
    fileInput.addEventListener('change', function() {
        const preview = document.getElementById('file-name-preview');
        if (this.files.length > 0) {
            preview.textContent = `📎 Выбран файл: ${this.files[0].name}`;
        } else {
            preview.textContent = '';
        }
    });
}

document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMessage');

    submitBtn.disabled = true;
    statusMsg.className = "status-msg";
    statusMsg.textContent = "Отправка заявки исполнителям...";

    const tech = document.querySelector('input[name="tech"]:checked').value;
    const rawDate = document.getElementById('date').value;
    const duration = document.getElementById('duration').value;
    const comment = document.getElementById('comment').value;

    let selectedName = usernameSelect.value;
    let finalUsername = selectedName === 'Иначе' ? customUsernameInput.value.trim() : (tgUsernames[selectedName] || selectedName);

    const formattedDate = rawDate.split('-').reverse().join('.');

    // Шаблон карточки ТЗ (без parse_mode Markdown, чтобы не крашился бэкенд)
    const messageText = 
`📋 НОВАЯ ЗАЯВКА НА ТЕХНИКУ\n` +
`━━━━━━━━━━━━━━━\n` +
`⚙️ Техника: ${tech}\n` +
`📅 Когда: ${formattedDate}\n` +
`⏳ На сколько: ${duration}\n` +
`👤 Заказчик: ${finalUsername}\n` +
`━━━━━━━━━━━━━━━\n` +
`📝 Задача и ТЗ:\n` +
`${comment}`;

    try {
        let response;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('chat_id', ADMIN_ID);
            formData.append('document', fileInput.files[0]);
            formData.append('caption', messageText);

            response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
        } else {
            response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_ID,
                    text: messageText
                }),
                signal: controller.signal
            });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.description || 'Ошибка API');
        }

        statusMsg.className = "status-msg success";
        statusMsg.textContent = "✅ Заявка успешно доставлена постановщику задач!";
        document.getElementById('orderForm').reset();
        if (document.getElementById('file-name-preview')) document.getElementById('file-name-preview').textContent = '';
        customUsernameInput.style.display = 'none';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];

    } catch (error) {
        console.error('Ошибка:', error);
        statusMsg.className = "status-msg error";
        if (error.name === 'AbortError') {
            statusMsg.textContent = "❌ Время ожидания истекло. Проверьте сеть или VPN.";
        } else {
            statusMsg.textContent = "❌ Ошибка сети. Убедитесь, что включен VPN на устройстве.";
        }
    } finally {
        submitBtn.disabled = false;
    }
});
