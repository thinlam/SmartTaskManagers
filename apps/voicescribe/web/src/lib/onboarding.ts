const SEEN_KEY = 'voicescribe.onboardingSeen';

/** One step of the first-run tour — see components/OnboardingTour.tsx. */
export interface OnboardingStep {
  /** Which page must be showing for this step's target to exist. */
  page: 'new' | 'detail';
  /** CSS selector for the element the spotlight/arrow points at. */
  selector: string;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    page: 'new',
    selector: '[data-tour="record-or-upload"]',
    title: 'Ghi âm hoặc tải file lên',
    description: 'Bắt đầu ở đây: ghi âm trực tiếp hoặc chọn một file âm thanh có sẵn để chuyển thành văn bản.',
  },
  {
    page: 'new',
    selector: '[data-tour="denoise-option"]',
    title: 'Lọc tạp âm trước khi xử lý',
    description: 'Mở "Tùy chọn" để bật lọc tạp âm nếu file có nhiều tiếng ồn nền.',
  },
  {
    page: 'detail',
    selector: '[data-tour="transcript-view"]',
    title: 'Bảng văn bản theo từng đoạn',
    description: 'Mỗi đoạn hội thoại hiện riêng, kèm người nói và mốc thời gian.',
  },
  {
    page: 'detail',
    selector: '[data-tour="audio-player"]',
    title: 'Nghe lại để đối chiếu',
    description: 'Nghe cả bản ghi, hoặc bấm nghe từng đoạn riêng trong bảng văn bản để so khớp.',
  },
  {
    page: 'detail',
    selector: '[data-tour="edit-toggle"]',
    title: 'Sửa chữ trực tiếp',
    description: 'Bấm "Chỉnh sửa" để sửa lỗi chính tả ngay trên văn bản.',
  },
  {
    page: 'detail',
    selector: '[data-tour="speaker-card"]',
    title: 'Chọn, thêm, đổi tên người nói',
    description: 'Quản lý danh sách người nói ở đây — đổi tên áp dụng cho mọi đoạn của người đó.',
  },
  {
    page: 'detail',
    selector: '[data-tour="trash-button"]',
    title: 'Xóa đoạn và thùng rác',
    description: 'Xóa một đoạn sẽ chuyển vào thùng rác, có thể khôi phục lại bất cứ lúc nào.',
  },
  {
    page: 'detail',
    selector: '[data-tour="export-menu"]',
    title: 'Xuất file',
    description: 'Xuất bản ghi ra Word, văn bản thuần, hoặc phụ đề có mốc thời gian.',
  },
];

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* preference just won't persist */
  }
}

/** Keeps a step index inside [0, length-1] — never lets Back/Continue run off either end. */
export function clampStepIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
