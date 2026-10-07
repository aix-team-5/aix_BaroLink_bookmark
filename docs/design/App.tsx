import { useRef, useState, type ReactNode } from "react";

type IconName =
  | "bookmark"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "folder"
  | "grid"
  | "history"
  | "lock"
  | "plus"
  | "search"
  | "sparkles";

const icons: Record<IconName, ReactNode> = {
  bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  close: <path d="m7 7 10 10M17 7 7 17" />,
  folder: <path d="M3.5 7A2 2 0 0 1 5.5 5h4l2 2h7A2 2 0 0 1 20.5 9v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z" />,
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </>
  ),
  history: (
    <>
      <path d="M4 6v5h5" />
      <path d="M5.8 17.5A8.5 8.5 0 1 0 4 11" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.1 3 2.9 1.5-2.9 1.4L12 12l-1.1-3.1L8 7.5 10.9 6 12 3Z" />
      <path d="m5.5 13 .8 2.2 2.2.8-2.2.8L5.5 19l-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      <path d="m18.5 12 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </>
  ),
};

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
}

function Button({
  children,
  className = "",
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`cursor-pointer transition-all duration-200 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

type SiteIconName = "notion" | "figma" | "drive" | "chat" | "pinterest";

function SiteMark({ name }: { name: SiteIconName }) {
  const marks: Record<SiteIconName, ReactNode> = {
    notion: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 16V8l8 8V8" />
      </>
    ),
    figma: (
      <>
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="7" r="3" />
        <circle cx="9" cy="12" r="3" />
        <circle cx="15" cy="12" r="3" />
        <circle cx="9" cy="17" r="3" />
      </>
    ),
    drive: <path d="m9 4-5 9 3 5h10l3-5-5-9H9Zm0 0 5 9m6 0H14l-3 5" />,
    chat: (
      <>
        <path d="M12 3.5a4 4 0 0 1 3.8 2.7 4 4 0 0 1 2.3 6.8 4 4 0 0 1-6.1 4.8A4 4 0 0 1 5.9 13a4 4 0 0 1 2.3-6.8A4 4 0 0 1 12 3.5Z" />
        <circle cx="12" cy="11" r="2.5" />
      </>
    ),
    pinterest: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M10 17 12.5 8.5M10.5 12.5c-1.8-3.5 4.8-5.2 4.8-.8 0 3.2-3.5 4.4-4.8 2.6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {marks[name]}
    </svg>
  );
}

const folders = [
  {
    name: "영상",
    count: 8,
    tone: "bg-rose-100 text-rose-500",
    items: [
      { name: "YouTube", url: "youtube.com", letter: "Y", color: "bg-red-500" },
      { name: "Vimeo Staff Picks", url: "vimeo.com", letter: "V", color: "bg-sky-500" },
      { name: "넷플릭스", url: "netflix.com", letter: "N", color: "bg-red-600" },
      { name: "TED Talks", url: "ted.com", letter: "T", color: "bg-slate-900" },
      { name: "왓챠", url: "watcha.com", letter: "W", color: "bg-pink-500" },
      { name: "디즈니 플러스", url: "disneyplus.com", letter: "D", color: "bg-blue-700" },
      { name: "Apple TV+", url: "tv.apple.com", letter: "A", color: "bg-slate-800" },
      { name: "네이버 TV", url: "tv.naver.com", letter: "N", color: "bg-emerald-500" },
    ],
  },
  {
    name: "학교",
    count: 6,
    tone: "bg-blue-100 text-blue-500",
    items: [
      { name: "사이버 캠퍼스", url: "class.ac.kr", letter: "C", color: "bg-blue-600" },
      { name: "학사 정보", url: "portal.ac.kr", letter: "P", color: "bg-indigo-500" },
      { name: "과제 제출함", url: "docs.google.com", letter: "D", color: "bg-amber-500" },
      { name: "학교 이메일", url: "mail.ac.kr", letter: "E", color: "bg-sky-500" },
      { name: "중앙 도서관", url: "library.ac.kr", letter: "L", color: "bg-teal-600" },
      { name: "수강 신청", url: "course.ac.kr", letter: "S", color: "bg-blue-500" },
    ],
  },
  {
    name: "블로그·글",
    count: 5,
    tone: "bg-amber-100 text-amber-600",
    items: [
      { name: "브런치", url: "brunch.co.kr", letter: "B", color: "bg-slate-900" },
      { name: "Medium", url: "medium.com", letter: "M", color: "bg-black" },
      { name: "Substack", url: "substack.com", letter: "S", color: "bg-orange-500" },
      { name: "퍼블리", url: "publy.co", letter: "P", color: "bg-emerald-600" },
      { name: "롱블랙", url: "longblack.co", letter: "L", color: "bg-slate-800" },
    ],
  },
  {
    name: "개발",
    count: 3,
    tone: "bg-violet-100 text-violet-500",
    items: [
      { name: "GitHub", url: "github.com", letter: "G", color: "bg-slate-900" },
      { name: "Stack Overflow", url: "stackoverflow.com", letter: "S", color: "bg-orange-500" },
      { name: "Vercel", url: "vercel.com", letter: "V", color: "bg-black" },
    ],
  },
];

const userFolder = {
  name: "졸업작품",
  count: 5,
  tone: "bg-emerald-100 text-emerald-600",
  items: [
    { name: "졸업 작품 일정", url: "calendar.example.com", letter: "졸", color: "bg-emerald-600" },
    { name: "전시 공간 레퍼런스", url: "space.example.com", letter: "전", color: "bg-blue-500" },
    { name: "팀 작업 문서", url: "docs.example.com", letter: "팀", color: "bg-amber-500" },
    { name: "포트폴리오 초안", url: "portfolio.example.com", letter: "포", color: "bg-violet-500" },
    { name: "인터뷰 기록", url: "interview.example.com", letter: "인", color: "bg-rose-500" },
  ],
};

const bookmarks = [
  { name: "Notion", url: "notion.so", letter: "N", tone: "bg-slate-900 text-white", isNew: false, siteIcon: "notion" as const },
  { name: "Figma", url: "figma.com", letter: "F", tone: "bg-orange-500 text-white", isNew: false, siteIcon: "figma" as const },
  { name: "Google Drive", url: "drive.google.com", letter: "G", tone: "bg-blue-500 text-white", isNew: false, siteIcon: "drive" as const },
  { name: "ChatGPT", url: "chatgpt.com", letter: "C", tone: "bg-emerald-600 text-white", isNew: true, siteIcon: "chat" as const },
  { name: "Pinterest", url: "pinterest.com", letter: "P", tone: "bg-red-500 text-white", isNew: false, siteIcon: "pinterest" as const },
  { name: "강의 자료실", url: "class.ac.kr", letter: "강", tone: "bg-indigo-500 text-white", isNew: true, siteIcon: null },
  { name: "Behance", url: "behance.net", letter: "B", tone: "bg-blue-600 text-white", isNew: false, siteIcon: null },
  {
    name: "2025년 졸업 작품 전시를 위한 사용자 경험 디자인 리서치 자료 모음",
    url: "design-research.example.com",
    letter: "2",
    tone: "bg-cyan-600 text-white",
    isNew: true,
    siteIcon: null,
  },
];

const forgottenSeed = [
  { name: "디자인 시스템 체크리스트", meta: "9개월 전 저장 · 8개월 전에 열어 봄", letter: "디", tone: "bg-slate-700", folderName: "졸업작품" },
  { name: "포트폴리오 구성 가이드", meta: "8개월 전 저장 · 7개월 전에 열어 봄", letter: "포", tone: "bg-cyan-600", folderName: "졸업작품" },
  { name: "무료 아이콘 라이브러리", meta: "7개월 전 저장 · 6개월 전에 열어 봄", letter: "무", tone: "bg-violet-500", folderName: "졸업작품" },
  { name: "2024 UX 리서치 가이드", meta: "6개월 전 저장 · 5개월 전에 열어 봄", letter: "U", tone: "bg-blue-600", folderName: "졸업작품" },
  { name: "사용자 인터뷰 질문지", meta: "5개월 전 저장 · 연 기록 없음", letter: "사", tone: "bg-amber-500", folderName: "졸업작품" },
  { name: "전시 공간 사례 모음", meta: "6개월 전 저장 · 4개월 전에 열어 봄", letter: "전", tone: "bg-rose-500", folderName: "졸업작품" },
  { name: "좋은 발표 자료 만드는 법", meta: "4개월 전 저장 · 3개월 전에 열어 봄", letter: "좋", tone: "bg-orange-500", folderName: "졸업작품" },
  { name: "졸업 작품 참고 아카이브", meta: "3개월 전 저장 · 연 기록 없음", letter: "졸", tone: "bg-emerald-600", folderName: "졸업작품" },
];

type HistoryEntry = {
  id: number;
  date: string;
  type: "첫 정리" | "새 북마크 정리";
  count: number;
  undone: boolean;
  newNames?: string[];
  folderAssignments?: Record<string, string>;
  moves: Array<{ name: string; from: string; to: string }>;
};

export default function App() {
  const [webQuery, setWebQuery] = useState("");
  const [bookmarkQuery, setBookmarkQuery] = useState("");
  const [modal, setModal] = useState<
    "forgotten" | "organize" | "folder" | "pin" | "history" | "newOrganize" | null
  >(null);
  const [selectedFolder, setSelectedFolder] = useState<
    (typeof folders)[number] | typeof userFolder | null
  >(null);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [organized, setOrganized] = useState(false);
  const [forgottenItems, setForgottenItems] = useState(forgottenSeed);
  const [newFolderAssignments, setNewFolderAssignments] = useState<Record<string, string>>({});
  const [newBookmarkNames, setNewBookmarkNames] = useState(
    bookmarks.filter((bookmark) => bookmark.isNew).map((bookmark) => bookmark.name),
  );
  const [newSelections, setNewSelections] = useState<Record<string, string>>({
    ChatGPT: "개발",
    "강의 자료실": "학교",
    "2025년 졸업 작품 전시를 위한 사용자 경험 디자인 리서치 자료 모음": "그대로 두기",
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<number[]>([]);
  const [resultNotice, setResultNotice] = useState<{
    message: string;
    historyId: number;
  } | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{
    item: (typeof forgottenSeed)[number];
    index: number;
  } | null>(null);
  const [pinnedNames, setPinnedNames] = useState([
    "Notion",
    "Figma",
    "Google Drive",
    "ChatGPT",
    "Pinterest",
  ]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const dynamicFolders = folders.map((folder) => {
    const addedItems = bookmarks
      .filter((bookmark) => newFolderAssignments[bookmark.name] === folder.name)
      .map((bookmark) => ({
        name: bookmark.name,
        url: bookmark.url,
        letter: bookmark.name.charAt(0),
        color: bookmark.tone,
      }));
    const items = [...folder.items, ...addedItems];
    return { ...folder, count: items.length, items };
  });
  const baseFolderBookmarks = folders.flatMap((folder) =>
    folder.items.map((item) => ({
      name: item.name,
      url: item.url,
      letter: item.name.charAt(0),
      tone: `${item.color} text-white`,
      isNew: false,
      siteIcon: null,
    })),
  );
  const looseBookmarks = bookmarks.filter((bookmark) => !newFolderAssignments[bookmark.name]);
  const displayedBookmarks = organized
    ? looseBookmarks
    : [...baseFolderBookmarks, ...looseBookmarks];
  const keyword = bookmarkQuery.trim().toLowerCase();
  const filtered = keyword
    ? displayedBookmarks.filter((item) =>
        [item.name, item.url].some((value) => value.toLowerCase().includes(keyword)),
      )
    : displayedBookmarks;
  const folderBookmarks = [userFolder, ...dynamicFolders].flatMap((folder) =>
    folder.items.map((item) => ({
      name: item.name,
      url: item.url,
      letter: item.name.charAt(0),
      tone: `${item.color} text-white`,
      isNew: false,
      siteIcon: null,
    })),
  );
  const forgottenBookmarks = forgottenSeed.map((item) => ({
    name: item.name,
    url: "저장된 북마크",
    letter: item.name.charAt(0),
    tone: `${item.tone} text-white`,
    isNew: false,
    siteIcon: null,
  }));
  const availableBookmarks = [...bookmarks, ...folderBookmarks, ...forgottenBookmarks].filter(
    (bookmark, index, allBookmarks) =>
      allBookmarks.findIndex((item) => item.name === bookmark.name) === index,
  );
  const pinnedBookmarks = availableBookmarks
    .filter((bookmark) => pinnedNames.includes(bookmark.name))
    .slice(0, 8);
  const newBookmarkCount = newBookmarkNames.length;
  const visibleFolders = organized ? [userFolder, ...dynamicFolders] : [userFolder];
  const todayText = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  const scheduleToastClear = (duration: number) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      setLastRemoved(null);
    }, duration);
  };

  const notify = (message: string) => {
    setLastRemoved(null);
    setToast(message);
    scheduleToastClear(2200);
  };

  const dismissForgotten = (name: string) => {
    const index = forgottenItems.findIndex((item) => item.name === name);
    if (index < 0) return;
    setLastRemoved({ item: forgottenItems[index], index });
    setForgottenItems((items) => items.filter((item) => item.name !== name));
    setToast("목록에서 뺐어요");
    scheduleToastClear(6000);
  };

  const removeForgotten = (name: string) => {
    setForgottenItems((items) => items.filter((item) => item.name !== name));
  };

  const showForgottenLocation = (forgottenItem: (typeof forgottenSeed)[number]) => {
    const folder = [userFolder, ...dynamicFolders].find(
      (item) => item.name === forgottenItem.folderName,
    );
    if (!folder) return;
    const alreadyIncluded = folder.items.some((item) => item.name === forgottenItem.name);
    setSelectedFolder(
      alreadyIncluded
        ? folder
        : {
            ...folder,
            count: folder.items.length + 1,
            items: [
              {
                name: forgottenItem.name,
                url: "저장된 북마크",
                letter: forgottenItem.name.charAt(0),
                color: forgottenItem.tone,
              },
              ...folder.items,
            ],
          },
    );
    setModal("folder");
  };

  const undoForgotten = () => {
    if (!lastRemoved) return;
    setForgottenItems((items) => {
      const restored = [...items];
      restored.splice(lastRemoved.index, 0, lastRemoved.item);
      return restored;
    });
    setLastRemoved(null);
    setToast(null);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  };

  const todayLabel = () => {
    const today = new Date();
    return `${today.getMonth() + 1}월 ${today.getDate()}일`;
  };

  const showResultNotice = (message: string, historyId: number) => {
    setResultNotice({ message, historyId });
    window.setTimeout(() => {
      setResultNotice((notice) => (notice?.historyId === historyId ? null : notice));
    }, 12000);
  };

  const organize = () => {
    const historyId = Date.now();
    const moves = folders.flatMap((folder, folderIndex) =>
      folder.items.map((item, itemIndex) => ({
        name: item.name,
        from: (folderIndex + itemIndex) % 5 === 0 ? "기타 북마크" : "북마크바",
        to: folder.name,
      })),
    );
    setHistory((entries) => [
      {
        id: historyId,
        date: todayLabel(),
        type: "첫 정리",
        count: 22,
        undone: false,
        moves,
      },
      ...entries,
    ]);
    setOrganized(true);
    setShowSuggestion(false);
    setModal(null);
    showResultNotice("폴더 4개를 만들고 북마크 22개를 넣었어요", historyId);
  };

  const organizeNewBookmarks = () => {
    const historyId = Date.now();
    const currentNewBookmarks = bookmarks.filter((bookmark) =>
      newBookmarkNames.includes(bookmark.name),
    );
    const moves = currentNewBookmarks.map((bookmark) => ({
      name: bookmark.name,
      from: "북마크바",
      to: newSelections[bookmark.name] ?? "그대로 두기",
    }));
    const movedCount = moves.filter((move) => move.to !== "그대로 두기").length;
    const folderAssignments = Object.fromEntries(
      moves
        .filter((move) => move.to !== "그대로 두기")
        .map((move) => [move.name, move.to]),
    );
    setHistory((entries) => [
      {
        id: historyId,
        date: todayLabel(),
        type: "새 북마크 정리",
        count: movedCount,
        undone: false,
        newNames: [...newBookmarkNames],
        folderAssignments,
        moves,
      },
      ...entries,
    ]);
    setNewFolderAssignments((assignments) => ({ ...assignments, ...folderAssignments }));
    setNewBookmarkNames([]);
    setModal(null);
    showResultNotice(
      movedCount === 0 ? "새 북마크를 그대로 뒀어요" : `새 북마크 ${movedCount}개를 정리했어요`,
      historyId,
    );
  };

  const undoHistory = (historyId: number) => {
    const entry = history.find((item) => item.id === historyId);
    if (!entry || entry.undone) return;
    if (entry.type === "첫 정리") {
      setOrganized(false);
      setShowSuggestion(true);
    } else if (entry.newNames) {
      setNewBookmarkNames((names) => Array.from(new Set([...names, ...entry.newNames!])));
      setNewFolderAssignments((assignments) => {
        const restored = { ...assignments };
        Object.keys(entry.folderAssignments ?? {}).forEach((name) => delete restored[name]);
        return restored;
      });
    }
    setHistory((entries) =>
      entries.map((item) => (item.id === historyId ? { ...item, undone: true } : item)),
    );
    setResultNotice(null);
    notify("원래대로 되돌렸어요");
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main
      data-app="bookmark-home"
      className="relative min-h-screen overflow-x-clip bg-[#f6f5f1] text-slate-800"
    >
      <div className="pointer-events-none absolute -left-32 -top-40 size-[34rem] rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-24 size-[36rem] rounded-full bg-violet-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-96 rounded-full bg-sky-100/50 blur-3xl" />

      {toast && (
        <div
          className={`fixed left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl ${
            resultNotice ? "top-28" : "top-6"
          }`}
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500">
            <Icon name="check" className="size-3.5" />
          </span>
          {toast}
          {lastRemoved && (
            <>
              <span className="text-slate-500">·</span>
              <Button onClick={undoForgotten} className="font-bold text-violet-300 hover:text-white">
                되돌리기
              </Button>
            </>
          )}
        </div>
      )}

      {resultNotice && (
        <div className="fixed left-1/2 top-6 z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center gap-3 rounded-2xl border border-violet-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl sm:px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <Icon name="check" className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-bold text-slate-800">
            {resultNotice.message}
          </span>
          <Button
            onClick={() => undoHistory(resultNotice.historyId)}
            className="shrink-0 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
          >
            되돌리기
          </Button>
          <Button
            ariaLabel="정리 결과 안내 닫기"
            onClick={() => setResultNotice(null)}
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="close" className="size-4" />
          </Button>
        </div>
      )}

      <nav className="sticky top-0 z-30 mx-auto flex max-w-7xl items-center justify-between bg-transparent px-6 py-4 shadow-none backdrop-blur-none lg:px-10">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300">
            <Icon name="bookmark" className="size-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight">바로링크</span>
          <span className="hidden rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-400 sm:block">
            MY BOOKMARK HOME
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-white/70 bg-white/60 p-1 shadow-sm backdrop-blur-md md:flex">
            <Button
              onClick={() => scrollToSection("my-folders")}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
            >
              <Icon name="folder" className="size-3.5" />
              내 폴더
            </Button>
            <Button
              onClick={() => scrollToSection("all-bookmarks")}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
            >
              <Icon name="grid" className="size-3.5" />
              모든 북마크
            </Button>
          </div>
          <Button
            onClick={() => {
              if (!organized) {
                setShowSuggestion(true);
                window.requestAnimationFrame(() =>
                  document
                    .getElementById("organize-suggestion")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                );
                return;
              }
              setModal("newOrganize");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold shadow-sm ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <Icon name="sparkles" className="size-4 text-violet-500" />
            <span className="hidden sm:inline">정리하기</span>
            {newBookmarkCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-violet-100 text-[11px] text-violet-600">
                {newBookmarkCount}
              </span>
            )}
          </Button>
          <Button
            ariaLabel="정리 기록"
            onClick={() => setModal("history")}
            className="rounded-full bg-white/70 p-3 text-slate-500 hover:bg-white hover:text-slate-900"
          >
            <Icon name="history" className="size-5" />
          </Button>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-64 pt-8 lg:px-10 lg:pt-14">
        <section className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-bold text-black">{todayText}</div>
          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/85 px-5 py-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl transition focus-within:ring-2 focus-within:ring-violet-300">
            <Icon name="search" className="size-5 shrink-0 text-slate-400" />
            <input
              value={webQuery}
              onChange={(event) => setWebQuery(event.target.value)}
              placeholder="웹 검색"
              className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
            />
          </label>
        </section>

        {showSuggestion && (
          <section
            id="organize-suggestion"
            className="mt-7 flex flex-col gap-5 overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-6 shadow-sm sm:flex-row sm:items-center"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Icon name="sparkles" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-slate-900">북마크를 이렇게 묶어 볼까요?</div>
              <div className="mt-1 text-sm text-slate-500">영상 8 · 학교 6 · 블로그·글 5 · 개발 3 · 나머지 8개는 그대로</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <Icon name="lock" className="size-3.5" />
                직접 만든 폴더와 북마크바에서 요즘 쓰는 북마크는 그대로 둬요
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                onClick={() => setShowSuggestion(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-400 hover:bg-white"
              >
                나중에
              </Button>
              <Button
                onClick={() => setModal("organize")}
                className="rounded-xl px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-100"
              >
                자세히 보기
              </Button>
              <Button
                onClick={organize}
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700"
              >
                정리하기
              </Button>
            </div>
          </section>
        )}

        <section
          id="my-folders"
          className="mt-14 scroll-mt-6 rounded-3xl border border-white/60 bg-white/35 p-5 shadow-lg shadow-sky-900/10 backdrop-blur-sm sm:p-7"
        >
          <div className="mb-5">
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900">내 폴더</div>
              <div className="mt-1 text-sm text-slate-400">북마크가 종류별로 모여 있어요</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-5 sm:gap-x-6">
            {forgottenItems.length > 0 && (
              <Button
                onClick={() => setModal("forgotten")}
                className="group relative min-h-36 overflow-hidden rounded-3xl bg-slate-900 p-4 text-left text-white shadow-xl shadow-slate-300/50 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="absolute -right-8 -top-10 size-28 rounded-full bg-violet-500/40 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                    <Icon name="clock" className="size-5 text-violet-200" />
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-full bg-violet-500 text-xs font-extrabold">
                    {forgottenItems.length}
                  </span>
                </div>
                <div className="relative mt-5 text-sm font-bold">잊고 있던 북마크</div>
                <div className="relative mt-1 text-xs text-slate-300">오랜만에 다시 만나보세요</div>
              </Button>
            )}

            {visibleFolders.map((folder) => (
              <Button
                key={folder.name}
                onClick={() => {
                  setSelectedFolder(folder);
                  setModal("folder");
                }}
                className="group flex min-w-0 flex-col items-center text-center hover:-translate-y-1"
              >
                <div className="grid aspect-square w-full max-w-32 grid-cols-2 gap-2 rounded-[2rem] border border-white/90 bg-white/65 p-3.5 shadow-lg shadow-slate-200/60 backdrop-blur-xl transition-all group-hover:bg-white group-hover:shadow-xl sm:p-4">
                  {folder.items.slice(0, 4).map((item) => (
                    <span
                      key={item.name}
                      className={`flex aspect-square items-center justify-center rounded-xl text-xs font-black text-white shadow-sm sm:text-sm ${item.color}`}
                    >
                      {item.name.charAt(0)}
                    </span>
                  ))}
                </div>
                <div className="mt-3 w-full truncate text-sm font-bold text-slate-800">{folder.name}</div>
                <div className="mt-1 text-[11px] font-medium text-slate-400">{folder.count}개</div>
              </Button>
            ))}
          </div>
        </section>

        <section
          id="all-bookmarks"
          className="mt-10 scroll-mt-6 rounded-3xl border border-white/70 bg-white/55 p-5 shadow-xl shadow-sky-900/10 backdrop-blur-md sm:p-7"
        >
          <div className="mb-5">
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900">
                {bookmarkQuery ? "검색 결과" : "모든 북마크"}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {bookmarkQuery
                  ? `${filtered.length}개의 북마크를 찾았어요`
                  : "폴더에 넣지 않은 북마크도 잊지 않게 보여드려요"}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/90 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-md transition focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-200">
              <Icon name="search" className="size-4.5 shrink-0 text-slate-500" />
              <input
                value={bookmarkQuery}
                onChange={(event) => setBookmarkQuery(event.target.value)}
                placeholder="북마크 제목 또는 주소로 검색"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-500"
              />
              {bookmarkQuery && (
                <Button
                  ariaLabel="북마크 검색어 지우기"
                  onClick={() => setBookmarkQuery("")}
                  className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                >
                  <Icon name="close" className="size-3.5" />
                </Button>
              )}
            </label>
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {filtered.map((bookmark) => (
              <Button
                key={bookmark.name}
                onClick={() => notify(`${bookmark.name}을 열었어요`)}
                className="group relative flex min-w-0 flex-col items-center rounded-2xl p-2 hover:bg-white/70"
              >
                {newBookmarkNames.includes(bookmark.name) && (
                  <span className="absolute right-1 top-0 z-10 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    새로
                  </span>
                )}
                <span className={`flex size-14 items-center justify-center rounded-2xl text-lg font-black shadow-md transition group-hover:-translate-y-1 group-hover:shadow-lg ${bookmark.tone}`}>
                  {bookmark.siteIcon ? <SiteMark name={bookmark.siteIcon} /> : bookmark.name.charAt(0)}
                </span>
                <span className="mt-2.5 line-clamp-2 min-h-8 w-full text-center text-xs font-bold leading-4 text-slate-700">
                  {bookmark.name}
                </span>
                <span className="mt-0.5 w-full truncate text-center text-[10px] text-slate-400">{bookmark.url}</span>
              </Button>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-20 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1 overflow-visible rounded-3xl border border-white/80 bg-white/75 p-2 shadow-2xl shadow-slate-400/30 backdrop-blur-xl sm:gap-2 sm:p-2.5">
        {pinnedBookmarks.map((bookmark) => (
          <div key={bookmark.name} className="group relative shrink-0">
            <span className="pointer-events-none absolute -top-10 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg group-hover:block">
              {bookmark.name}
            </span>
            <Button
              ariaLabel={`${bookmark.name} 열기`}
              onClick={() => notify(`${bookmark.name}을 열었어요`)}
              className={`flex size-10 items-center justify-center rounded-xl font-black shadow-sm hover:-translate-y-2 hover:shadow-lg sm:size-12 sm:rounded-2xl ${bookmark.tone}`}
            >
              {bookmark.siteIcon ? <SiteMark name={bookmark.siteIcon} /> : bookmark.name.charAt(0)}
            </Button>
            <Button
              ariaLabel={`${bookmark.name} 고정 해제`}
              onClick={() =>
                setPinnedNames((names) => names.filter((name) => name !== bookmark.name))
              }
              className="absolute -right-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-md group-hover:flex"
            >
              <Icon name="close" className="size-3" />
            </Button>
          </div>
        ))}
        {pinnedBookmarks.length < 8 && (
          <>
            <span className="mx-0.5 h-8 w-px shrink-0 bg-slate-200 sm:mx-1" />
            <Button
              ariaLabel="고정 북마크 추가"
              onClick={() => setModal("pin")}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 sm:size-12 sm:rounded-2xl"
            >
              <Icon name="plus" className="size-5" />
            </Button>
          </>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div
            className={`relative w-full ${
              modal === "folder"
                ? "max-w-4xl"
                : modal === "history" || modal === "newOrganize"
                  ? "max-w-2xl"
                  : "max-w-xl"
            }`}
          >
          <section className="max-h-[85vh] w-full overflow-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
                  <span className={`flex size-9 items-center justify-center rounded-xl ${modal === "forgotten" ? "bg-slate-900 text-white" : "bg-violet-100 text-violet-600"}`}>
                    <Icon
                      name={
                        modal === "forgotten"
                          ? "clock"
                          : modal === "folder"
                            ? "folder"
                            : modal === "pin"
                              ? "bookmark"
                              : modal === "history"
                                ? "history"
                              : "sparkles"
                      }
                      className="size-4.5"
                    />
                  </span>
                  {modal === "forgotten"
                    ? "잊고 있던 북마크"
                    : modal === "folder"
                      ? selectedFolder?.name
                      : modal === "pin"
                        ? "고정할 북마크 고르기"
                        : modal === "history"
                          ? "정리 기록"
                          : modal === "newOrganize"
                            ? "새 북마크 정리"
                        : "북마크 정리하기"}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {modal === "forgotten"
                    ? "30일 넘게 열지 않은 북마크를 다시 꺼내 왔어요."
                    : modal === "folder"
                      ? `${selectedFolder?.count ?? 0}개의 북마크가 이 폴더에 저장되어 있어요.`
                      : modal === "pin"
                        ? `고정됨에 추가할 북마크를 선택하세요. 고정은 8개까지 할 수 있어요.`
                        : modal === "history"
                          ? "북마크를 옮긴 기록과 원래 위치를 확인할 수 있어요."
                          : modal === "newOrganize"
                            ? "추천 폴더를 확인하고 필요한 항목만 바꿔 주세요."
                        : "적용하기 전까지 기존 북마크는 바뀌지 않아요."}
                </div>
              </div>
              <Button
                ariaLabel="창 닫기"
                onClick={() => setModal(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800"
              >
                <Icon name="close" className="size-5" />
              </Button>
            </div>

            {modal === "forgotten" ? (
              <div className="mt-6 space-y-2">
                {forgottenItems.slice(0, 8).map((item) => (
                  <div
                    key={item.name}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 hover:bg-slate-50"
                  >
                    <Button
                      ariaLabel={`${item.name} 열기`}
                      onClick={() => {
                        removeForgotten(item.name);
                        setModal(null);
                        notify(`${item.name}을 열었어요`);
                      }}
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-black text-white ${item.tone}`}
                    >
                      {item.name.charAt(0)}
                    </Button>
                    <span className="min-w-0 flex-1 text-left">
                      <Button
                        onClick={() => {
                          removeForgotten(item.name);
                          setModal(null);
                          notify(`${item.name}을 열었어요`);
                        }}
                        className="block max-w-full truncate text-left text-sm font-bold text-slate-700 hover:text-violet-700"
                      >
                        {item.name}
                      </Button>
                      <span className="mt-0.5 block text-xs text-slate-400">{item.meta}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <Button
                          onClick={() => {
                            if (pinnedNames.includes(item.name)) {
                              removeForgotten(item.name);
                              notify("이미 고정됨에 추가되어 있어요");
                              return;
                            }
                            if (pinnedNames.length >= 8) {
                              notify("고정은 8개까지 할 수 있어요");
                              return;
                            }
                            setPinnedNames((names) => [...names, item.name]);
                            removeForgotten(item.name);
                            notify(`${item.name}을 고정됨에 추가했어요`);
                          }}
                          className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100"
                        >
                          고정하기
                        </Button>
                        <Button
                          onClick={() => dismissForgotten(item.name)}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                        >
                          이제 안 봐도 됨
                        </Button>
                        <Button
                          onClick={() => showForgottenLocation(item)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100"
                        >
                          어디 있는지 보기
                        </Button>
                      </span>
                    </span>
                  </div>
                ))}
                {forgottenItems.length > 8 && (
                  <div className="py-2 text-center text-xs font-bold text-violet-600">
                    {forgottenItems.length - 8}개 더 있어요 · 모두 보기
                  </div>
                )}
                <div className="pt-3 text-center text-xs text-slate-400">북마크는 원래 폴더에 그대로 있어요</div>
              </div>
            ) : modal === "folder" && selectedFolder ? (
              <div className="mt-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {selectedFolder.items.map((item) => (
                    <Button
                      key={item.name}
                      onClick={() => {
                        setModal(null);
                        notify(`${item.name}을 열었어요`);
                      }}
                      className="group flex min-w-0 flex-col items-center rounded-2xl border border-slate-100 p-4 text-center hover:border-slate-200 hover:bg-slate-50"
                    >
                      <span
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl font-black text-white ${item.color}`}
                      >
                        {item.name.charAt(0)}
                      </span>
                      <span className="mt-3 min-w-0 w-full">
                        <span className="block truncate text-sm font-bold text-slate-700">{item.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">{item.url}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : modal === "pin" ? (
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {availableBookmarks.map((bookmark) => {
                  const isPinned = pinnedNames.includes(bookmark.name);
                  return (
                    <Button
                      key={bookmark.name}
                      onClick={() => {
                        if (isPinned || pinnedNames.length >= 8) return;
                        setPinnedNames((names) => [...names, bookmark.name].slice(0, 8));
                        setModal(null);
                        notify(`${bookmark.name}을 고정됨에 추가했어요`);
                      }}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${
                        isPinned
                          ? "cursor-default border-slate-100 bg-slate-50 opacity-55"
                          : "border-slate-100 hover:border-violet-200 hover:bg-violet-50"
                      }`}
                    >
                      <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-black ${bookmark.tone}`}
                      >
                        {bookmark.siteIcon ? (
                          <SiteMark name={bookmark.siteIcon} />
                        ) : (
                          bookmark.name.charAt(0)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-700">
                          {bookmark.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {isPinned ? "이미 고정됨" : bookmark.url}
                        </span>
                      </span>
                      {isPinned && <Icon name="check" className="size-4 text-violet-500" />}
                    </Button>
                  );
                })}
              </div>
            ) : modal === "history" ? (
              <div className="mt-6">
                {history.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-400">
                    아직 정리한 기록이 없어요
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry) => {
                      const expanded = expandedHistoryIds.includes(entry.id);
                      return (
                        <div
                          key={entry.id}
                          className="overflow-hidden rounded-2xl border border-slate-100 bg-white"
                        >
                          <div className="flex items-center gap-3 p-4">
                            <Button
                              onClick={() =>
                                setExpandedHistoryIds((ids) =>
                                  expanded
                                    ? ids.filter((id) => id !== entry.id)
                                    : [...ids, entry.id],
                                )
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <span
                                className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                                  entry.undone
                                    ? "bg-slate-100 text-slate-400"
                                    : "bg-violet-50 text-violet-600"
                                }`}
                              >
                                <Icon name="history" className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-slate-800">
                                  {entry.date} · {entry.type} · {entry.count}개 이동
                                </span>
                              </span>
                              <Icon
                                name="chevron"
                                className={`size-4 shrink-0 text-slate-400 transition-transform ${
                                  expanded ? "rotate-90" : ""
                                }`}
                              />
                            </Button>
                            {entry.undone ? (
                              <span className="shrink-0 px-2 text-xs font-bold text-slate-400">
                                되돌림
                              </span>
                            ) : (
                              <Button
                                onClick={() => undoHistory(entry.id)}
                                className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                              >
                                되돌리기
                              </Button>
                            )}
                          </div>
                          {expanded && (
                            <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                              {entry.moves.map((move) => (
                                <div
                                  key={`${entry.id}-${move.name}`}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="min-w-0 flex-1 truncate font-bold text-slate-700">
                                    {move.name}
                                  </span>
                                  <span className="shrink-0 text-slate-400">
                                    {move.from} → {move.to}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : modal === "newOrganize" ? (
              <div className="mt-6">
                {newBookmarkNames.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-400">
                    새로 정리할 북마크가 없어요
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookmarks
                      .filter((bookmark) => newBookmarkNames.includes(bookmark.name))
                      .map((bookmark) => (
                        <div
                          key={bookmark.name}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-3 sm:flex-row sm:items-center"
                        >
                          <span
                            className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-black ${bookmark.tone}`}
                          >
                            {bookmark.siteIcon ? (
                              <SiteMark name={bookmark.siteIcon} />
                            ) : (
                              bookmark.name.charAt(0)
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold text-slate-800">
                                {bookmark.name}
                              </span>
                              <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                                새로
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-400">
                              {bookmark.url}
                            </span>
                          </span>
                          <select
                            aria-label={`${bookmark.name}을 넣을 폴더`}
                            value={newSelections[bookmark.name] ?? "그대로 두기"}
                            onChange={(event) =>
                              setNewSelections((selections) => ({
                                ...selections,
                                [bookmark.name]: event.target.value,
                              }))
                            }
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                          >
                            <option value="그대로 두기">그대로 두기</option>
                            {folders.map((folder) => (
                              <option key={folder.name} value={folder.name}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                )}
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    onClick={() => setModal(null)}
                    className="rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-slate-100"
                  >
                    취소
                  </Button>
                  {newBookmarkNames.length > 0 && (
                    <Button
                      onClick={organizeNewBookmarks}
                      className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                    >
                      정리하기
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {folders.map((folder) => (
                    <div key={folder.name} className="rounded-2xl bg-slate-50 p-3">
                      <span className={`flex size-9 items-center justify-center rounded-xl ${folder.tone}`}>
                        <Icon name="folder" className="size-4" />
                      </span>
                      <div className="mt-3 text-sm font-bold">{folder.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{folder.count}개 이동</div>
                      <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                        {folder.items.map((item) => (
                          <div key={item.name} className="truncate text-[10px] font-medium text-slate-500">
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                  나머지 8개는 지금 위치에 그대로 둘게요.
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                  <Icon name="lock" className="size-3.5" />
                  직접 만든 폴더와 북마크바에서 요즘 쓰는 북마크는 그대로 둬요
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <Button onClick={() => setModal(null)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-slate-100">
                    취소
                  </Button>
                  <Button onClick={organize} className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700">
                    정리하기
                  </Button>
                </div>
              </div>
            )}
          </section>
          </div>
        </div>
      )}
    </main>
  );
}
