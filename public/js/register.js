import { apiFetch } from './api.js';

const form = document.getElementById('register-form');
const message = document.getElementById('auth-message');

function setMessage(text) {
  if (!text) {
    message.textContent = '';
    message.className = 'inline-message is-hidden';
    return;
  }

  message.textContent = text;
  message.className = 'inline-message';
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
        name: formData.get('name'),
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
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
