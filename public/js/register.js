import { apiFetch } from './api.js';

const form = document.getElementById('register-form');
const message = document.getElementById('auth-message');
const avatarInput = document.getElementById('avatar-input');
const avatarButtons = [...document.querySelectorAll('[data-avatar-option]')];

function setMessage(text) {
  if (!text) {
    message.textContent = '';
    message.className = 'inline-message is-hidden';
    return;
  }

  message.textContent = text;
  message.className = 'inline-message';
}

function setSelectedAvatar(value) {
  avatarInput.value = value;

  avatarButtons.forEach((button) => {
    const isSelected = button.dataset.avatarOption === value;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-checked', String(isSelected));
  });
}

avatarButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setSelectedAvatar(button.dataset.avatarOption || '');
  });
});

if (avatarButtons[0] && !avatarInput.value) {
  setSelectedAvatar(avatarButtons[0].dataset.avatarOption || '');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Creating account...';

  try {
    const formData = new FormData(form);

    await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        avatar: formData.get('avatar')
      })
    });

    window.location.href = '/';
  } catch (error) {
    setMessage(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Create account';
  }
});
