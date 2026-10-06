#!/usr/bin/env node

// ==============================================================================
// Physique 57 · Telegram Webhook Registration Utility
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';

// Helper to parse simple .env files if variables are not in process.env
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Attempt loading .env.local then .env
const cwd = process.cwd();
loadEnvFile(path.join(cwd, '.env.local'));
loadEnvFile(path.join(cwd, '.env'));

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
let appUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;

console.log('--- Physique 57 · Telegram Webhook Configurator ---');

if (!botToken) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing from environment variables or .env file.');
  console.error('Please obtain a bot token from @BotFather and set TELEGRAM_BOT_TOKEN.');
  process.exit(1);
}

if (!webhookSecret) {
  console.error('❌ Error: TELEGRAM_WEBHOOK_SECRET is missing from environment variables or .env file.');
  console.error('Please define a secure random string (1-256 characters) for TELEGRAM_WEBHOOK_SECRET.');
  process.exit(1);
}

if (!appUrl) {
  console.error('❌ Error: Neither VERCEL_URL nor NEXT_PUBLIC_APP_URL is defined.');
  console.error('Please set NEXT_PUBLIC_APP_URL to your public HTTPS URL (e.g., https://p57-helpdesk.vercel.app).');
  process.exit(1);
}

// Normalize base URL
if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
  appUrl = `https://${appUrl}`;
}

if (appUrl.startsWith('http://localhost') || appUrl.startsWith('http://127.0.0.1')) {
  console.warn('⚠️ Warning: Telegram webhooks require a public HTTPS URL. Localhost without a tunnel (like ngrok) will fail.');
}

const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/telegram/webhook`;

console.log(`📡 Registering Webhook URL: ${webhookUrl}`);
console.log(`🔐 Using secret token: ${webhookSecret.slice(0, 4)}... (length: ${webhookSecret.length})`);

try {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ['message'],
    }),
  });

  const data = await response.json();
  if (data.ok) {
    console.log('✅ Telegram webhook registered successfully!');
    console.log('Telegram API Response:', data);
  } else {
    console.error('❌ Failed to register Telegram webhook:');
    console.error(data);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Network error while contacting Telegram API:', error.message);
  process.exit(1);
}
