import React, { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useCollection, orderBy, limit } from '../hooks/useCollection';
import { ms, NEWS_CATEGORIES, type AdminNews } from '../lib/types';
import { formatDateTime, titleCase } from '../lib/format';
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  TableSkeleton,
  errorMessage,
  useToast,
} from '../components/ui';

type Draft = {
  title: string;
  summary: string;
  body: string;
  category: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
  isPremium: boolean;
  publish: boolean;
};

const EMPTY: Draft = {
  title: '',
  summary: '',
  body: '',
  category: 'forex',
  imageUrl: '',
  source: '',
  sourceUrl: '',
  isPremium: false,
  publish: true,
};

/**
 * News management. Drafts stay unpublished and are invisible to the app until
 * their status flips — the notification only fires on creation with
 * status "published".
 */
export function News() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data, loading, error } = useCollection<AdminNews>(
    'news',
    (d) => {
      const v = d.data();
      return {
        id: d.id,
        title: v.title ?? '',
        summary: v.summary ?? '',
        body: v.body ?? '',
        category: v.category ?? 'forex',
        imageUrl: v.imageUrl,
        source: v.source,
        isPremium: v.isPremium === true,
        status: v.status ?? 'published',
        publishedAt: ms(v.publishedAt),
      };
    },
    [orderBy('publishedAt', 'desc'), limit(100)],
    ['news-list'],
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error('A title and body are required.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'news'), {
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        body: draft.body.trim(),
        category: draft.category,
        imageUrl: draft.imageUrl.trim(),
        source: draft.source.trim(),
        sourceUrl: draft.sourceUrl.trim(),
        isPremium: draft.isPremium,
        status: draft.publish ? 'published' : 'draft',
        authorId: auth.currentUser?.uid ?? 'admin',
        publishedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      toast.success(draft.publish ? 'Article published' : 'Draft saved');
      setOpen(false);
      setDraft(EMPTY);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (article: AdminNews) => {
    try {
      await updateDoc(doc(db, 'news', article.id), {
        status: article.status === 'published' ? 'draft' : 'published',
      });
      toast.success(article.status === 'published' ? 'Moved to drafts' : 'Published');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (article: AdminNews) => {
    if (!window.confirm(`Delete "${article.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'news', article.id));
      toast.success('Article deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">News</h1>
          <p className="page-sub">{data.length} articles</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          + New article
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="No articles yet" message="Publish market news to keep the feed alive." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((article) => (
                  <tr key={article.id}>
                    <td style={{ maxWidth: 340 }}>
                      <div className="cell-name">{article.title}</div>
                      <div className="cell-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {article.summary}
                      </div>
                    </td>
                    <td>
                      <Badge tone="info">{titleCase(article.category)}</Badge>
                    </td>
                    <td>
                      <Badge tone={article.isPremium ? 'premium' : 'neutral'}>
                        {article.isPremium ? 'Premium' : 'Free'}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={article.status === 'published' ? 'profit' : 'warning'}>
                        {article.status}
                      </Badge>
                    </td>
                    <td className="cell-sub">{formatDateTime(article.publishedAt)}</td>
                    <td className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => void togglePublish(article)}>
                        {article.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>{' '}
                      <button className="btn btn-ghost btn-sm" onClick={() => void remove(article)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal
          title="New article"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : draft.publish ? 'Publish' : 'Save draft'}
              </button>
            </>
          }
        >
          <Field label="Headline">
            <input className="input" value={draft.title} onChange={(e) => set('title', e.target.value)} />
          </Field>

          <Field label="Summary" hint="One or two sentences shown in the feed.">
            <input className="input" value={draft.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>

          <Field label="Body">
            <textarea
              className="textarea"
              style={{ minHeight: 180 }}
              value={draft.body}
              onChange={(e) => set('body', e.target.value)}
            />
          </Field>

          <div className="form-grid">
            <Field label="Category">
              <select className="select" value={draft.category} onChange={(e) => set('category', e.target.value)}>
                {NEWS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {titleCase(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <input className="input" value={draft.source} onChange={(e) => set('source', e.target.value)} placeholder="Market desk" />
            </Field>
          </div>

          <Field label="Image URL">
            <input className="input" value={draft.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
          </Field>

          <Field label="Source URL">
            <input className="input" value={draft.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://…" />
          </Field>

          <label className="checkbox">
            <input type="checkbox" checked={draft.isPremium} onChange={(e) => set('isPremium', e.target.checked)} />
            Premium only
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={draft.publish} onChange={(e) => set('publish', e.target.checked)} />
            Publish immediately and notify members
          </label>
        </Modal>
      )}
    </div>
  );
}
