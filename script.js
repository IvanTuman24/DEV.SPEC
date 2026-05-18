// Конфигурация твоего бота (Зашиваем напрямую)
const BOT_TOKEN = "7918430423:AAFPKEfOzZqmggP6nRMNZIPxG_ivXi4y41U";
const ADMIN_ID = "702501770";

// Установка минимальной даты на сегодня
const dateInput = document.getElementById('date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today; // Предзаполняем сегодняшней датой
}

// Логика отображения имени выбранного файла
document.getElementById('fileInput').addEventListener('change', function() {
    const preview = document.getElementById('file-name-preview');
    if (this.files.length > 0) {
        preview.textContent = `📎 Выбран файл: ${this.files[0].name}`;
    } else {
        preview.textContent = '';
    }
});

// Форматирование даты для вывода
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}

// Перехватываем отправку формы
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMessage');

    // Блокируем кнопку на время отправки
    submitBtn.disabled = true;
    statusMsg.className = "status-msg";
    statusMsg.textContent = "Отправка заявки исполнителям...";

    // Сбор полей
    const tech = document.querySelector('input[name="tech"]:checked').value;
    const dateValue = document.getElementById('date').value;
    const duration = document.getElementById('duration').value;
    const username = document.getElementById('username').value;
    const comment = document.getElementById('comment').value;
    const fileInput = document.getElementById('fileInput');

    // Форматируем дату для красивого вывода
    const formattedDate = formatDate(dateValue);

    // Формируем чистый, красивый шаблон карточки для твоего Телеграма
    const messageText = 
`📋 **НОВАЯ ЗАЯВКА НА ТЕХНИКУ**
━━━━━━━━━━━━━━━
⚙️ **Техника:** ${tech}
📅 **Когда:** ${formattedDate}
⏳ **На сколько:** ${duration}
👤 **Заказчик:** ${username}
━━━━━━━━━━━━━━━
📝 **Задача и ТЗ:**
${comment}`;

    try {
        // Проверяем, прикрепил ли пользователь файл
        if (fileInput.files.length > 0) {
            // Вариант С ФАЙЛОМ: пакуем всё в FormData и отправляем через sendDocument
            const formData = new FormData();
            formData.append('chat_id', ADMIN_ID);
            formData.append('document', fileInput.files[0]);
            formData.append('caption', messageText);
            formData.append('parse_mode', 'Markdown');

            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Ошибка при отправке файла в Telegram API');

        } else {
            // Вариант БЕЗ ФАЙЛА: отправляем обычный текстовый sendMessage
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_ID,
                    text: messageText,
                    parse_mode: 'Markdown'
                })
            });

            if (!response.ok) throw new Error('Ошибка при отправке текста в Telegram API');
        }

        // Финал: Успех
        statusMsg.className = "status-msg success";
        statusMsg.textContent = "✅ Заявка успешно доставлена постановщику задач!";
        document.getElementById('orderForm').reset();
        document.getElementById('file-name-preview').textContent = '';
        
        // Возвращаем минимальную дату на сегодня
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }

    } catch (error) {
        console.error(error);
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "❌ Ошибка сети. Не удалось передать данные.";
    } finally {
        // Возвращаем кнопку в рабочее состояние
        submitBtn.disabled = false;
    }
});