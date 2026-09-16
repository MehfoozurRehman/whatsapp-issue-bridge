import express from 'express';
import cors from 'cors';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';

type Media = {src?: string; type: string; data?: string};
type Message = {index?: number; text?: string; timestamp?: string; media?: Media[]};
type Job = {id: string; status: 'queued'|'processing'|'completed'|'failed'; createdAt: string; completedAt?: string; repo: string; messages: Message[]; issueUrl?: string; issue?: {title: string; body: string; labels?: string[]}; error?: string};
const dataDir = path.resolve('data');
const historyPath = path.join(dataDir, 'history.json');
const jobs = new Map<string, Job>();
await fs.mkdir(dataDir, {recursive: true});

async function history(): Promise<Job[]> { try { return JSON.parse(await fs.readFile(historyPath, 'utf8')) as Job[]; } catch { return []; } }
async function saveHistory(items: Job[]): Promise<void> { await fs.writeFile(historyPath, JSON.stringify(items, null, 2)); }
function command(program: string, args: string[]): Promise<string> { return new Promise((resolve, reject) => { const executable = process.platform === 'win32' ? `${program}.cmd` : program; execFile(executable, args, {windowsHide: true, maxBuffer: 10 * 1024 * 1024}, (error, stdout, stderr) => error ? reject(new Error(stderr || stdout || error.message)) : resolve(stdout)); }); }
async function publishMedia(repo: string, relativePath: string, bytes: Buffer): Promise<string> { if (bytes.length > 8 * 1024 * 1024) throw new Error(`Media file ${relativePath} exceeds the 8 MB GitHub API limit`); await command('gh', ['api', `repos/${repo}/contents/${relativePath}`, '--method', 'PUT', '--field', 'message=Add WhatsApp issue evidence', '--field', `content=${bytes.toString('base64')}`]); return `https://github.com/${repo}/blob/main/${relativePath}`; }

const app = express(); app.use(cors()); app.use(express.json({limit: '10mb'}));
app.get('/api/health', (_req, res) => res.json({ok: true, service: 'whatsapp-issue-bridge'}));
app.get('/api/repos', async (_req, res) => { try { res.json({repos: JSON.parse(await command('gh', ['repo','list','--limit','100','--json','nameWithOwner,description']))}); } catch (error) { res.status(500).json({error: String(error)}); } });
app.post('/api/jobs', async (req, res) => { const repo = typeof req.body?.repo === 'string' ? req.body.repo.trim() : ''; const messages = Array.isArray(req.body?.messages) ? req.body.messages : []; if (!repo || messages.length === 0) { res.status(400).json({error: 'repo and at least one message are required'}); return; } const id = crypto.randomUUID(); const job: Job = {id, status: 'queued', createdAt: new Date().toISOString(), repo, messages}; jobs.set(id, job); const dir = path.join(dataDir, 'jobs', id); await fs.mkdir(dir, {recursive: true}); await fs.writeFile(path.join(dir, 'messages.json'), JSON.stringify(job.messages, null, 2)); void processJob(job, dir); res.status(202).json({id, status: job.status}); });
app.get('/api/jobs/:id', (req, res) => { const job = jobs.get(req.params.id); job ? res.json({job}) : res.status(404).json({error: 'Not found'}); });
app.get('/api/history', async (_req, res) => res.json({history: await history()}));
async function processJob(job: Job, dir: string): Promise<void> { job.status = 'processing'; try { let mediaCount = 0; const mediaLinks: string[] = []; for (const message of job.messages) for (const media of message.media ?? []) if (media.data) { const ext = media.type === 'audio' ? 'webm' : media.type === 'video' ? 'mp4' : 'bin'; const filename = `media-${++mediaCount}.${ext}`; const bytes = Buffer.from(media.data, 'base64'); await fs.writeFile(path.join(dir, filename), bytes); mediaLinks.push(await publishMedia(job.repo, `.github/whatsapp-issue-evidence/${job.id}/${filename}`, bytes)); delete media.data; } await fs.writeFile(path.join(dir, 'messages.json'), JSON.stringify(job.messages, null, 2)); const prompt = `Read ${path.join(dir, 'messages.json')} and inspect any media files in ${dir}. Triage these WhatsApp support messages into one GitHub issue for ${job.repo}. Return ONLY JSON with title, body, labels. Infer affected school/product/module only when supported. Include reproduction, expected/actual behavior, evidence references, and open questions.`; const raw = await command('gemini', ['-p', prompt]); const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? ''); job.issue = parsed; const evidence = mediaLinks.length ? `\n\n### Evidence\n${mediaLinks.map(link => `- [Attached WhatsApp media](${link})`).join('\n')}` : ''; const created = await command('gh', ['issue', 'create', '--repo', job.repo, '--title', parsed.title, '--body', `${parsed.body}${evidence}`]); job.issueUrl = created.trim().split(/\s+/).find(value => value.includes('/issues/')) ?? created.trim(); job.status = 'completed'; job.completedAt = new Date().toISOString(); } catch (error) { job.status = 'failed'; job.error = error instanceof Error ? error.message : String(error); } const items = await history(); items.unshift(job); await saveHistory(items); }
app.listen(8765, '127.0.0.1', () => console.log('WhatsApp Issue Bridge listening on http://127.0.0.1:8765'));
