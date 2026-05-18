const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// --- УПРАВЛЕНИЕ КАЛЕНДАРЕМ ---
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

// --- ЛОГИКА ВЫБОРА ЗАКАЗЧИКА ---
const usernameSelect = document.getElementById('usernameSelect');
const customUsernameInput = document.getElementById('customUsername');

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

// Отображение имени прикрепленного файла
document.getElementById('fileInput').addEventListener('change', function() {
    const preview = document.getElementById('file-name-preview');
    if (this.files.length > 0) {
        preview.textContent = `📎 Выбран файл: ${this.files[0].name}`;
    } else {
        preview.textContent = '';
    }
});

// Отправка формы в Telegram
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
    const fileInput = document.getElementById('fileInput');

    let finalUsername = usernameSelect.value;
    if (finalUsername === 'Иначе') {
        finalUsername = customUsernameInput.value.trim();
    }

    const formattedDate = rawDate.split('-').reverse().join('.');

    // Экранируем текст под HTML, чтобы бот не падал от символов < и >
    const safeComment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeUsername = finalUsername.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Пересобрали карточку на HTML-разметку (она не виснет из-за спецсимволов)
    const messageHtml = 
`<b>📋 НОВАЯ ЗАЯВКА НА ТЕХНИКУ</b>\n` +
`━━━━━━━━━━━━━━━\n` +
`⚙️ <b>Техника:</b> ${tech}\n` +
`📅 <b>Когда:</b> ${formattedDate}\n` +
`⏳ <b>На сколько:</b> ${duration}\n` +
`👤 <b>Заказчик:</b> ${safeUsername}\n` +
`━━━━━━━━━━━━━━━\n` +
`📝 <b>Задача и ТЗ:</b>\n` +
`${safeComment}`;

    try {
        let response;
        
        // Настройка таймаута, чтобы отправка не "висела" вечно, если сеть лежит
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд на ответ

        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('chat_id', ADMIN_ID);
            formData.append('document', fileInput.files[0]);
            formData.append('caption', messageHtml);
            formData.append('parse_mode', 'HTML');

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
                    text: messageHtml,
                    parse_mode: 'HTML'
                }),
                signal: controller.signal
            });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Telegram API Error:', errorData);
            throw new Error(`API вернул ошибку: ${errorData.description}`);
        }

        // УСПЕХ
        statusMsg.className = "status-msg success";
        statusMsg.textContent = "✅ Заявка успешно доставлена постановщику задач!";
        document.getElementById('orderForm').reset();
        document.getElementById('file-name-preview').textContent = '';
        customUsernameInput.style.display = 'none';
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

    } catch (error) {
        console.error('Network/Parsing Error:', error);
        statusMsg.className = "status-msg error";
        
        if (error.name === 'AbortError') {
            statusMsg.textContent = "❌ Превышено время ожидания. Проверьте VPN/подключение.";
        } else {
            statusMsg.textContent = "❌ Ошибка отправки. Бот не запущен или заблокирован.";
        }
    } finally {
        submitBtn.disabled = false;
    }
});
