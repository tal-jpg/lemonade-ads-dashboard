import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy as fsOrderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCollection, orderBy } from '../hooks/useCollection';
import { ms, COURSE_CATEGORIES, type AdminCourse } from '../lib/types';
import { titleCase } from '../lib/format';
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

type LessonRow = {
  id: string;
  title: string;
  type: string;
  order: number;
  durationMinutes: number;
  isPremium: boolean;
};

/**
 * Course and lesson management.
 *
 * Lessons live in a subcollection and are loaded on demand, so opening this
 * page costs one small query no matter how large the library grows.
 */
export function Courses() {
  const toast = useToast();
  const [courseModal, setCourseModal] = useState(false);
  const [lessonsFor, setLessonsFor] = useState<AdminCourse | null>(null);

  const { data, loading, error } = useCollection<AdminCourse>(
    'courses',
    (d) => {
      const v = d.data();
      return {
        id: d.id,
        title: v.title ?? '',
        description: v.description ?? '',
        category: v.category ?? 'forex_basics',
        level: v.level ?? 'beginner',
        isPremium: v.isPremium === true,
        lessonCount: v.lessonCount ?? 0,
        status: v.status ?? 'published',
        order: v.order ?? 999,
      };
    },
    [orderBy('order', 'asc')],
    ['courses-list'],
  );

  const [draft, setDraft] = useState({
    title: '',
    description: '',
    category: 'forex_basics',
    level: 'beginner',
    isPremium: false,
    estimatedMinutes: '30',
    order: '1',
    publish: true,
  });
  const [saving, setSaving] = useState(false);

  const createCourse = async () => {
    if (!draft.title.trim()) {
      toast.error('A title is required.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'courses'), {
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        level: draft.level,
        isPremium: draft.isPremium,
        lessonCount: 0,
        estimatedMinutes: Number.parseInt(draft.estimatedMinutes, 10) || 30,
        order: Number.parseInt(draft.order, 10) || 999,
        status: draft.publish ? 'published' : 'draft',
        createdAt: serverTimestamp(),
      });
      toast.success('Course created');
      setCourseModal(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async (course: AdminCourse) => {
    if (!window.confirm(`Delete "${course.title}" and all of its lessons?`)) return;
    try {
      const lessons = await getDocs(collection(db, 'courses', course.id, 'lessons'));
      await Promise.all(lessons.docs.map((l) => deleteDoc(l.ref)));
      await deleteDoc(doc(db, 'courses', course.id));
      toast.success('Course deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Education</h1>
          <p className="page-sub">{data.length} courses</p>
        </div>
        <button className="btn" onClick={() => setCourseModal(true)}>
          + New course
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : error ? (
          <ErrorState message={error} />
        ) : data.length === 0 ? (
          <EmptyState title="No courses yet" message="Create a course, then add its lessons." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Category</th>
                  <th>Level</th>
                  <th>Lessons</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((course) => (
                  <tr key={course.id}>
                    <td style={{ maxWidth: 300 }}>
                      <div className="cell-name">{course.title}</div>
                      <div className="cell-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course.description}
                      </div>
                    </td>
                    <td>
                      <Badge tone="primary">{titleCase(course.category)}</Badge>
                    </td>
                    <td className="cell-sub">{titleCase(course.level)}</td>
                    <td className="mono">{course.lessonCount}</td>
                    <td>
                      <Badge tone={course.isPremium ? 'premium' : 'neutral'}>
                        {course.isPremium ? 'Premium' : 'Free'}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={course.status === 'published' ? 'profit' : 'warning'}>{course.status}</Badge>
                    </td>
                    <td className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setLessonsFor(course)}>
                        Lessons
                      </button>{' '}
                      <button className="btn btn-ghost btn-sm" onClick={() => void removeCourse(course)}>
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

      {courseModal && (
        <Modal
          title="New course"
          onClose={() => setCourseModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setCourseModal(false)}>
                Cancel
              </button>
              <button className="btn" onClick={createCourse} disabled={saving}>
                {saving ? 'Saving…' : 'Create course'}
              </button>
            </>
          }
        >
          <Field label="Title">
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea
              className="textarea"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
          <div className="form-grid">
            <Field label="Category">
              <select className="select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {COURSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {titleCase(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Level">
              <select className="select" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
            <Field label="Estimated minutes">
              <input className="input mono" value={draft.estimatedMinutes} onChange={(e) => setDraft({ ...draft, estimatedMinutes: e.target.value })} />
            </Field>
            <Field label="Sort order">
              <input className="input mono" value={draft.order} onChange={(e) => setDraft({ ...draft, order: e.target.value })} />
            </Field>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={draft.isPremium} onChange={(e) => setDraft({ ...draft, isPremium: e.target.checked })} />
            Premium course
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={draft.publish} onChange={(e) => setDraft({ ...draft, publish: e.target.checked })} />
            Publish immediately
          </label>
        </Modal>
      )}

      {lessonsFor && <LessonManager course={lessonsFor} onClose={() => setLessonsFor(null)} />}
    </div>
  );
}

function LessonManager({ course, onClose }: { course: AdminCourse; onClose: () => void }) {
  const toast = useToast();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    type: 'text',
    content: '',
    videoUrl: '',
    pdfUrl: '',
    durationMinutes: '8',
    isPremium: course.isPremium,
  });

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'courses', course.id, 'lessons'), fsOrderBy('order', 'asc')),
      );
      setLessons(
        snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            title: v.title ?? '',
            type: v.type ?? 'text',
            order: v.order ?? 0,
            durationMinutes: v.durationMinutes ?? 0,
            isPremium: v.isPremium === true,
          };
        }),
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  const addLesson = async () => {
    if (!draft.title.trim()) {
      toast.error('A lesson title is required.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'courses', course.id, 'lessons'), {
        courseId: course.id,
        title: draft.title.trim(),
        type: draft.type,
        content: draft.content.trim(),
        videoUrl: draft.videoUrl.trim(),
        pdfUrl: draft.pdfUrl.trim(),
        durationMinutes: Number.parseInt(draft.durationMinutes, 10) || 5,
        order: lessons.length + 1,
        isPremium: draft.isPremium,
      });
      toast.success('Lesson added');
      setDraft({ ...draft, title: '', content: '', videoUrl: '', pdfUrl: '' });
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (lesson: LessonRow) => {
    if (!window.confirm(`Delete "${lesson.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'courses', course.id, 'lessons', lesson.id));
      await updateDoc(doc(db, 'courses', course.id), {
        lessonCount: Math.max(0, lessons.length - 1),
      });
      toast.success('Lesson deleted');
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal title={`Lessons · ${course.title}`} onClose={onClose}>
      {loading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : lessons.length === 0 ? (
        <EmptyState title="No lessons yet" message="Add the first lesson below." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Lesson</th>
                <th>Type</th>
                <th>Access</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson, index) => (
                <tr key={lesson.id}>
                  <td className="mono">{index + 1}</td>
                  <td>
                    <div className="cell-name">{lesson.title}</div>
                    <div className="cell-sub">{lesson.durationMinutes} min</div>
                  </td>
                  <td>
                    <Badge tone="info">{lesson.type}</Badge>
                  </td>
                  <td>
                    <Badge tone={lesson.isPremium ? 'premium' : 'neutral'}>
                      {lesson.isPremium ? 'Premium' : 'Free'}
                    </Badge>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => void removeLesson(lesson)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card card-flat" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong style={{ fontSize: 13 }}>Add a lesson</strong>

        <Field label="Title">
          <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </Field>

        <div className="form-grid">
          <Field label="Type">
            <select className="select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <option value="text">Text</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="quiz">Quiz</option>
            </select>
          </Field>
          <Field label="Duration (minutes)">
            <input className="input mono" value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })} />
          </Field>
        </div>

        {draft.type === 'text' && (
          <Field label="Content">
            <textarea className="textarea" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
          </Field>
        )}
        {draft.type === 'video' && (
          <Field label="Video URL" hint="An MP4 or HLS URL from Firebase Storage.">
            <input className="input" value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} />
          </Field>
        )}
        {draft.type === 'pdf' && (
          <Field label="PDF URL">
            <input className="input" value={draft.pdfUrl} onChange={(e) => setDraft({ ...draft, pdfUrl: e.target.value })} />
          </Field>
        )}
        {draft.type === 'quiz' && (
          <p className="hint">
            Quiz questions are stored on the lesson document as a <code>quiz</code> array. Seed one
            with scripts/seed.ts as a template, then edit it here in a future iteration.
          </p>
        )}

        <label className="checkbox">
          <input type="checkbox" checked={draft.isPremium} onChange={(e) => setDraft({ ...draft, isPremium: e.target.checked })} />
          Premium lesson
        </label>

        <button className="btn btn-sm" onClick={addLesson} disabled={saving}>
          {saving ? 'Adding…' : 'Add lesson'}
        </button>
      </div>
    </Modal>
  );
}
