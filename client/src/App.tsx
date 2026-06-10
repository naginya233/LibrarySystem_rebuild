import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Library,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Undo2,
  UserCog,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ChartPoint } from './BorrowChart';

const BorrowChart = lazy(() => import('./BorrowChart'));

const API = '/api';

type Session = {
  token: string;
  username: string;
  role: 'Admin' | 'Reader';
  readerCardNo?: string;
};

type Book = {
  isbn: string;
  title: string;
  publisher: string;
  author: string;
  totalCopies: number;
  availableCopies: number;
  isBorrowable: boolean;
};

type Reader = {
  readerCardNo: string;
  name: string;
  gender: string;
  title: string;
  maxBorrowCount: number;
  borrowedCount: number;
  department: string;
  phone?: string;
  unpaidFine: number;
};

type Loan = {
  loanId: number;
  readerCardNo: string;
  readerName: string;
  isbn: string;
  bookTitle: string;
  borrowDate: string;
  loanDays: number;
  dueDate: string;
  returnDate?: string | null;
  fine: number;
  finePaid: boolean;
  remark?: string;
  status: string;
};

type Account = {
  accountId: number;
  username: string;
  role: 'Admin' | 'Reader';
  readerCardNo?: string;
  isEnabled: boolean;
};

type Overdue = {
  loanId: number;
  isbn: string;
  title: string;
  readerName: string;
  readerCardNo: string;
  borrowDate: string;
  dueDate: string;
  overdueDays: number;
  estimatedFine: number;
};

type Dashboard = {
  stats: Record<string, number>;
  monthly: ChartPoint[];
  popular: { title: string; count: number }[];
};

type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

const emptyBook: Book = {
  isbn: '',
  title: '',
  publisher: '',
  author: '',
  totalCopies: 1,
  availableCopies: 1,
  isBorrowable: true,
};

const emptyReader: Reader = {
  readerCardNo: '',
  name: '',
  gender: '男',
  title: '本科生',
  maxBorrowCount: 5,
  borrowedCount: 0,
  department: '',
  phone: '',
  unpaidFine: 0,
};

const emptyLoan = {
  readerCardNo: '',
  isbn: '',
  borrowDate: today(),
  loanDays: 30,
  returnDate: '',
  fine: 0,
  finePaid: true,
  remark: '',
};

const emptyAccount = {
  username: '',
  password: 'reader123',
  role: 'Reader',
  readerCardNo: '',
  isEnabled: true,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  return value ? value.slice(0, 10) : '-';
}

async function request<T>(path: string, session: Session | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const response = await fetch(`${API}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? response.statusText ?? '请求失败');
  }

  return data as T;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem('library-session');
    return raw ? (JSON.parse(raw) as Session) : null;
  });

  const saveSession = (next: Session | null) => {
    setSession(next);
    if (next) {
      localStorage.setItem('library-session', JSON.stringify(next));
    } else {
      localStorage.removeItem('library-session');
    }
  };

  if (!session) {
    return <LoginPage onLogin={saveSession} />;
  }

  return <Shell session={session} onLogout={() => saveSession(null)} />;
}

function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await request<Session>('/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark">
          <Library size={30} />
        </div>
        <h1>中山大学深圳校区图书管理系统</h1>
        <p>管理员：admin / admin123；读者：2024001 / reader123</p>
        <form onSubmit={submit} className="login-form">
          <label>
            账号
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            密码
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="error-line">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? '登录中' : '登录'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Shell({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [active, setActive] = useState('dashboard');
  const admin = session.role === 'Admin';
  const nav: NavItem[] = [
    { key: 'dashboard', label: '仪表盘', icon: BarChart3 },
    { key: 'books', label: '图书管理', icon: BookOpen },
    admin ? { key: 'readers', label: '读者管理', icon: Users } : { key: 'profile', label: '我的信息', icon: Users },
    { key: 'loans', label: admin ? '借阅管理' : '我的借阅', icon: ClipboardList },
    { key: 'overdue', label: '逾期查询', icon: AlertTriangle },
    ...(admin ? [{ key: 'accounts', label: '账号管理', icon: UserCog }] : []),
    { key: 'docs', label: '系统文档', icon: FileText },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Library size={24} />
          <div>
            <strong>图书管理</strong>
            <span>SYSU Shenzhen</span>
          </div>
        </div>
        <nav>
          {nav.map(({ key, label, icon: Icon }) => (
            <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>{nav.find((item) => item.key === active)?.label}</h2>
            <span>{session.role === 'Admin' ? '管理员工作台' : '读者自助查询'}</span>
          </div>
          <div className="topbar-actions">
            <span className="role-badge">{session.role === 'Admin' ? '管理员' : '读者'}</span>
            <span className="username">{session.username}</span>
            <button className="icon-button" onClick={onLogout} title="退出登录">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="content">
          {active === 'dashboard' && <DashboardPage session={session} />}
          {active === 'books' && <BooksPage session={session} />}
          {active === 'readers' && <ReadersPage session={session} />}
          {active === 'profile' && <ProfilePage session={session} />}
          {active === 'loans' && <LoansPage session={session} />}
          {active === 'overdue' && <OverduePage session={session} />}
          {active === 'accounts' && <AccountsPage session={session} />}
          {active === 'docs' && <DocsPage />}
        </main>
      </section>
    </div>
  );
}

function DashboardPage({ session }: { session: Session }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [overdue, setOverdue] = useState<Overdue[]>([]);

  useEffect(() => {
    void request<Dashboard>('/reports/dashboard', session).then(setData);
    void request<Overdue[]>('/reports/overdue', session).then(setOverdue);
  }, [session]);

  const stats = data?.stats ?? {};
  const cards = session.role === 'Admin'
    ? [
        ['馆藏种类', stats.bookKinds ?? 0],
        ['馆藏册数', stats.totalCopies ?? 0],
        ['可借册数', stats.availableCopies ?? 0],
        ['借出中', stats.currentLoans ?? 0],
        ['逾期未还', stats.overdueLoans ?? 0],
        ['未缴罚款', `¥${Number(stats.unpaidFine ?? 0).toFixed(2)}`],
      ]
    : [
        ['当前借阅', stats.currentLoans ?? 0],
        ['逾期未还', stats.overdueLoans ?? 0],
        ['未缴罚款', `¥${Number(stats.unpaidFine ?? 0).toFixed(2)}`],
        ['历史借阅', stats.totalLoans ?? 0],
      ];

  return (
    <section className="page-stack">
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <PanelTitle title="近六月借阅趋势" />
          <div className="chart-box">
            <Suspense fallback={<EmptyState text="图表加载中" />}>
              <BorrowChart data={data?.monthly ?? []} />
            </Suspense>
          </div>
        </section>
        <section className="panel">
          <PanelTitle title="逾期未还" />
          <DataTable
            columns={['ISBN', '书名', '读者', '应还日期', '罚款']}
            rows={overdue.slice(0, 6).map((item) => [
              item.isbn,
              item.title,
              item.readerName,
              formatDate(item.dueDate),
              `¥${item.estimatedFine.toFixed(2)}`,
            ])}
          />
        </section>
      </div>
    </section>
  );
}

function BooksPage({ session }: { session: Session }) {
  const [items, setItems] = useState<Book[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Book>(emptyBook);
  const [editing, setEditing] = useState(false);
  const admin = session.role === 'Admin';

  async function load() {
    setItems(await request<Book[]>(`/books?q=${encodeURIComponent(q)}`, session));
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await request(editing ? `/books/${form.isbn}` : '/books', session, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    });
    setForm(emptyBook);
    setEditing(false);
    await load();
  }

  async function remove(isbn: string) {
    if (!confirm('确认删除该图书？')) return;
    await request(`/books/${isbn}`, session, { method: 'DELETE' });
    await load();
  }

  return (
    <CrudLayout
      title="图书检索"
      q={q}
      setQ={setQ}
      onSearch={load}
      action={admin ? <button className="secondary-button" onClick={() => { setForm(emptyBook); setEditing(false); }}><Plus size={16} />新增</button> : null}
    >
      {admin && (
        <form className="edit-grid" onSubmit={save}>
          <Field label="ISBN"><input required disabled={editing} value={form.isbn} onChange={(event) => setForm({ ...form, isbn: event.target.value })} /></Field>
          <Field label="书名"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="出版社"><input required value={form.publisher} onChange={(event) => setForm({ ...form, publisher: event.target.value })} /></Field>
          <Field label="作者"><input required value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} /></Field>
          <Field label="馆藏数量"><input type="number" min="0" value={form.totalCopies} onChange={(event) => setForm({ ...form, totalCopies: Number(event.target.value) })} /></Field>
          <Field label="可借数量"><input type="number" min="0" value={form.availableCopies} onChange={(event) => setForm({ ...form, availableCopies: Number(event.target.value) })} /></Field>
          <label className="check-field"><input type="checkbox" checked={form.isBorrowable} onChange={(event) => setForm({ ...form, isBorrowable: event.target.checked })} /> 可借</label>
          <button className="primary-button"><Save size={16} />保存图书</button>
        </form>
      )}
      <table className="data-table">
        <thead><tr><th>ISBN</th><th>书名</th><th>作者</th><th>出版社</th><th>馆藏</th><th>可借</th><th>状态</th>{admin && <th>操作</th>}</tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.isbn}>
              <td>{item.isbn}</td><td>{item.title}</td><td>{item.author}</td><td>{item.publisher}</td><td>{item.totalCopies}</td><td>{item.availableCopies}</td>
              <td><span className={item.isBorrowable ? 'tag ok' : 'tag warn'}>{item.isBorrowable ? '可借' : '不可借'}</span></td>
              {admin && <td className="row-actions"><button onClick={() => { setForm(item); setEditing(true); }}>编辑</button><button onClick={() => void remove(item.isbn)}><Trash2 size={15} /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </CrudLayout>
  );
}

function ReadersPage({ session }: { session: Session }) {
  const [items, setItems] = useState<Reader[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Reader>(emptyReader);
  const [editing, setEditing] = useState(false);

  async function load() {
    setItems(await request<Reader[]>(`/readers?q=${encodeURIComponent(q)}`, session));
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await request(editing ? `/readers/${form.readerCardNo}` : '/readers', session, {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    });
    setForm(emptyReader);
    setEditing(false);
    await load();
  }

  async function remove(cardNo: string) {
    if (!confirm('确认删除该读者？')) return;
    await request(`/readers/${cardNo}`, session, { method: 'DELETE' });
    await load();
  }

  async function pay(cardNo: string) {
    await request(`/readers/${cardNo}/pay-fine`, session, { method: 'POST', body: '{}' });
    await load();
  }

  return (
    <CrudLayout title="读者检索" q={q} setQ={setQ} onSearch={load}>
      <form className="edit-grid" onSubmit={save}>
        <Field label="借书证号"><input required disabled={editing} value={form.readerCardNo} onChange={(event) => setForm({ ...form, readerCardNo: event.target.value })} /></Field>
        <Field label="姓名"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="性别"><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option>男</option><option>女</option><option>其他</option></select></Field>
        <Field label="职称"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="可借数量"><input type="number" min="0" value={form.maxBorrowCount} onChange={(event) => setForm({ ...form, maxBorrowCount: Number(event.target.value) })} /></Field>
        <Field label="已借数量"><input type="number" min="0" value={form.borrowedCount} onChange={(event) => setForm({ ...form, borrowedCount: Number(event.target.value) })} /></Field>
        <Field label="工作部门"><input required value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></Field>
        <Field label="联系电话"><input value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <button className="primary-button"><Save size={16} />保存读者</button>
      </form>
      <table className="data-table">
        <thead><tr><th>借书证号</th><th>姓名</th><th>性别</th><th>职称</th><th>部门</th><th>已借/可借</th><th>未缴罚款</th><th>操作</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.readerCardNo}>
              <td>{item.readerCardNo}</td><td>{item.name}</td><td>{item.gender}</td><td>{item.title}</td><td>{item.department}</td><td>{item.borrowedCount}/{item.maxBorrowCount}</td><td>¥{item.unpaidFine.toFixed(2)}</td>
              <td className="row-actions"><button onClick={() => { setForm(item); setEditing(true); }}>编辑</button><button onClick={() => void pay(item.readerCardNo)}><CircleDollarSign size={15} /></button><button onClick={() => void remove(item.readerCardNo)}><Trash2 size={15} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </CrudLayout>
  );
}

function ProfilePage({ session }: { session: Session }) {
  const [profile, setProfile] = useState<{ reader: Reader; openLoans: Loan[] } | null>(null);

  useEffect(() => {
    if (session.readerCardNo) {
      void request<{ reader: Reader; openLoans: Loan[] }>(`/readers/${session.readerCardNo}`, session).then(setProfile);
    }
  }, [session]);

  if (!profile) return <EmptyState text="正在读取个人信息" />;

  return (
    <section className="page-stack">
      <div className="metric-grid">
        <article className="metric-card"><span>姓名</span><strong>{profile.reader.name}</strong></article>
        <article className="metric-card"><span>已借/可借</span><strong>{profile.reader.borrowedCount}/{profile.reader.maxBorrowCount}</strong></article>
        <article className="metric-card"><span>未缴罚款</span><strong>¥{profile.reader.unpaidFine.toFixed(2)}</strong></article>
      </div>
      <section className="panel">
        <PanelTitle title="未归还图书" />
        <DataTable columns={['ISBN', '书名', '借出日期', '应还日期', '状态']} rows={profile.openLoans.map((item) => [item.isbn, item.bookTitle, formatDate(item.borrowDate), formatDate(item.dueDate), item.status])} />
      </section>
    </section>
  );
}

function LoansPage({ session }: { session: Session }) {
  const [items, setItems] = useState<Loan[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyLoan);
  const [editingId, setEditingId] = useState<number | null>(null);
  const admin = session.role === 'Admin';

  async function load() {
    setItems(await request<Loan[]>(`/borrow-records?q=${encodeURIComponent(q)}&status=${status}`, session));
  }

  useEffect(() => {
    void load();
    if (admin) {
      void request<Book[]>('/books', session).then(setBooks);
      void request<Reader[]>('/readers', session).then(setReaders);
    }
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const body = {
      ...form,
      returnDate: form.returnDate || null,
    };
    await request(editingId ? `/borrow-records/${editingId}` : '/borrow-records', session, {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    setForm(emptyLoan);
    setEditingId(null);
    await load();
  }

  async function borrow() {
    await request('/borrow-records/borrow', session, {
      method: 'POST',
      body: JSON.stringify({
        readerCardNo: form.readerCardNo,
        isbn: form.isbn,
        borrowDate: form.borrowDate,
        loanDays: form.loanDays,
      }),
    });
    setForm(emptyLoan);
    await load();
  }

  async function returnBook(loanId: number) {
    await request(`/borrow-records/${loanId}/return`, session, {
      method: 'POST',
      body: JSON.stringify({ returnDate: today() }),
    });
    await load();
  }

  async function remove(loanId: number) {
    if (!confirm('确认删除该借阅记录？')) return;
    await request(`/borrow-records/${loanId}`, session, { method: 'DELETE' });
    await load();
  }

  return (
    <CrudLayout
      title="借阅检索"
      q={q}
      setQ={setQ}
      onSearch={load}
      action={<select className="compact-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option><option value="open">借出中</option><option value="overdue">逾期</option><option value="returned">已归还</option></select>}
    >
      {admin && (
        <form className="edit-grid" onSubmit={save}>
          <Field label="读者"><select required value={form.readerCardNo} onChange={(event) => setForm({ ...form, readerCardNo: event.target.value })}><option value="">选择读者</option>{readers.map((reader) => <option key={reader.readerCardNo} value={reader.readerCardNo}>{reader.readerCardNo} {reader.name}</option>)}</select></Field>
          <Field label="图书"><select required value={form.isbn} onChange={(event) => setForm({ ...form, isbn: event.target.value })}><option value="">选择图书</option>{books.map((book) => <option key={book.isbn} value={book.isbn}>{book.title}</option>)}</select></Field>
          <Field label="借出日期"><input type="date" value={form.borrowDate} onChange={(event) => setForm({ ...form, borrowDate: event.target.value })} /></Field>
          <Field label="借阅期限"><input type="number" min="1" value={form.loanDays} onChange={(event) => setForm({ ...form, loanDays: Number(event.target.value) })} /></Field>
          <Field label="归还日期"><input type="date" value={form.returnDate} onChange={(event) => setForm({ ...form, returnDate: event.target.value })} /></Field>
          <Field label="罚款"><input type="number" min="0" step="0.5" value={form.fine} onChange={(event) => setForm({ ...form, fine: Number(event.target.value) })} /></Field>
          <label className="check-field"><input type="checkbox" checked={form.finePaid} onChange={(event) => setForm({ ...form, finePaid: event.target.checked })} /> 已缴罚款</label>
          <div className="button-row"><button className="primary-button"><Save size={16} />保存记录</button><button type="button" className="secondary-button" onClick={() => void borrow()}><Plus size={16} />办理借书</button></div>
        </form>
      )}
      <table className="data-table">
        <thead><tr><th>编号</th><th>书名</th><th>读者</th><th>借出</th><th>应还</th><th>归还</th><th>罚款</th><th>状态</th>{admin && <th>操作</th>}</tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.loanId}>
              <td>{item.loanId}</td><td>{item.bookTitle}</td><td>{item.readerName}</td><td>{formatDate(item.borrowDate)}</td><td>{formatDate(item.dueDate)}</td><td>{formatDate(item.returnDate)}</td><td>¥{item.fine.toFixed(2)}</td>
              <td><span className={item.status === '逾期' ? 'tag danger' : item.status === '已归还' ? 'tag ok' : 'tag'}>{item.status}</span></td>
              {admin && <td className="row-actions"><button onClick={() => { setEditingId(item.loanId); setForm({ readerCardNo: item.readerCardNo, isbn: item.isbn, borrowDate: formatDate(item.borrowDate), loanDays: item.loanDays, returnDate: item.returnDate ? formatDate(item.returnDate) : '', fine: item.fine, finePaid: item.finePaid, remark: item.remark ?? '' }); }}>编辑</button>{!item.returnDate && <button onClick={() => void returnBook(item.loanId)}><Undo2 size={15} /></button>}<button onClick={() => void remove(item.loanId)}><Trash2 size={15} /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </CrudLayout>
  );
}

function AccountsPage({ session }: { session: Session }) {
  const [items, setItems] = useState<Account[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [form, setForm] = useState(emptyAccount);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    setItems(await request<Account[]>('/accounts', session));
    setReaders(await request<Reader[]>('/readers', session));
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await request(editingId ? `/accounts/${editingId}` : '/accounts', session, {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify({ ...form, readerCardNo: form.role === 'Reader' ? form.readerCardNo : null }),
    });
    setForm(emptyAccount);
    setEditingId(null);
    await load();
  }

  async function remove(accountId: number) {
    if (!confirm('确认删除该账号？')) return;
    await request(`/accounts/${accountId}`, session, { method: 'DELETE' });
    await load();
  }

  return (
    <section className="page-stack">
      <form className="edit-grid panel" onSubmit={save}>
        <Field label="账号"><input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></Field>
        <Field label="密码"><input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
        <Field label="权限"><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="Admin">Admin</option><option value="Reader">Reader</option></select></Field>
        <Field label="关联读者"><select value={form.readerCardNo} onChange={(event) => setForm({ ...form, readerCardNo: event.target.value })}><option value="">无</option>{readers.map((reader) => <option key={reader.readerCardNo} value={reader.readerCardNo}>{reader.name}</option>)}</select></Field>
        <label className="check-field"><input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} /> 启用</label>
        <button className="primary-button"><Save size={16} />保存账号</button>
      </form>
      <section className="panel">
        <DataTable columns={['账号', '权限', '读者证号', '状态', '操作']} rows={items.map((item) => [item.username, item.role, item.readerCardNo ?? '-', item.isEnabled ? '启用' : '禁用', <span className="row-actions" key={item.accountId}><button onClick={() => { setEditingId(item.accountId); setForm({ username: item.username, password: 'reader123', role: item.role, readerCardNo: item.readerCardNo ?? '', isEnabled: item.isEnabled }); }}>编辑</button><button onClick={() => void remove(item.accountId)}><Trash2 size={15} /></button></span>])} />
      </section>
    </section>
  );
}

function OverduePage({ session }: { session: Session }) {
  const [items, setItems] = useState<Overdue[]>([]);

  useEffect(() => {
    void request<Overdue[]>('/reports/overdue', session).then(setItems);
  }, [session]);

  return (
    <section className="panel">
      <PanelTitle title="到期未还图书" />
      <DataTable columns={['记录号', 'ISBN', '书名', '读者', '借出日期', '应还日期', '逾期天数', '预计罚款']} rows={items.map((item) => [item.loanId, item.isbn, item.title, `${item.readerName} / ${item.readerCardNo}`, formatDate(item.borrowDate), formatDate(item.dueDate), item.overdueDays, `¥${item.estimatedFine.toFixed(2)}`])} />
    </section>
  );
}

function DocsPage() {
  return (
    <section className="page-stack">
      <article className="panel doc-panel">
        <PanelTitle title="交付文档" />
        <p>项目包含数据库设计报告、系统设计文档和运行说明，源码根目录下的 docs 文件夹可直接提交。</p>
        <ul>
          <li>数据库设计报告：E-R 图、关系模式、表结构、约束、视图、索引、存储过程。</li>
          <li>系统设计文档：架构、模块、接口、权限、业务流程、测试。</li>
          <li>运行说明：Docker SQL Server、后端、前端、桌面壳和安装包构建步骤。</li>
        </ul>
      </article>
    </section>
  );
}

function CrudLayout({
  title,
  q,
  setQ,
  onSearch,
  action,
  children,
}: {
  title: string;
  q: string;
  setQ: (value: string) => void;
  onSearch: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="page-stack">
      <div className="toolbar panel">
        <div className="search-box">
          <Search size={17} />
          <input placeholder={title} value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSearch(); }} />
        </div>
        <button className="secondary-button" onClick={onSearch}><RefreshCw size={16} />刷新</button>
        {action}
      </div>
      <section className="panel table-panel">{children}</section>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function PanelTitle({ title }: { title: string }) {
  return <div className="panel-title"><h3>{title}</h3></div>;
}

function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) {
    return <EmptyState text="暂无数据" />;
  }

  return (
    <table className="data-table">
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
