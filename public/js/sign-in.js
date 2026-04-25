import { apiFetch } from './api.js';

const form = document.getElementById('sign-in-form');
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
  submitButton.textContent = 'Signing in...';

  try {
    const formData = new FormData(form);

    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password')
      })
    });

    window.location.href = '/feed';
  } catch (error) {
    setMessage(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Continue';
  }
});
