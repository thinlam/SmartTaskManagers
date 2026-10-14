export type AppStatus = 'ready' | 'beta' | 'soon';

export interface AppPlatform {
  /** e.g. "Microsoft Excel (Windows)" */
  label: string;
  /** Short note shown under the label, e.g. "Setup.exe · cài add-in và template .xltx" */
  note: string;
  /** Label of the download button, e.g. "Tải Setup.exe" */
  actionLabel: string;
  /** GitHub Release asset URL. Null when not published yet. */
  downloadUrl: string | null;
}

export interface AppFeature {
  title: string;
  desc: string;
}

export interface AppEntry {
  id: string;
  /** Short badge text, e.g. "ST" */
  badge: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  tags: string[];
  category: string;
  status: AppStatus;
  featured?: boolean;
  platforms: AppPlatform[];
  features?: AppFeature[];
  installSteps?: string[];
}

export const apps: AppEntry[] = [
  {
    id: 'smart-task-manager',
    badge: 'ST',
    name: 'Smart Task Manager',
    shortDesc:
      'Ứng dụng Desktop quản lý công việc: Dashboard, Kanban, Calendar, Gantt và SmartScore.',
    longDesc:
      'Ứng dụng Desktop (Windows) quản lý công việc cá nhân: theo dõi task, deadline, dự án và thành viên với Dashboard, Kanban, Calendar, Gantt và báo cáo. SmartScore và Risk được tính bằng quy tắc rõ ràng, không cần AI. Đồng bộ với backend riêng, không phải add-in Excel.',
    tags: ['Windows Desktop', 'Web App'],
    category: 'Quản lý công việc',
    status: 'ready',
    featured: true,
    platforms: [
      {
        label: 'Windows Desktop (khuyên dùng)',
        note: 'Setup.exe · cài ứng dụng Smart Task Manager, không cần Excel',
        actionLabel: 'Tải Setup.exe',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/latest/download/smart-task-manager_0.1.0_x64-setup.exe',
      },
      {
        label: 'Windows Desktop (.msi)',
        note: 'Dùng nếu công ty/tổ chức bạn yêu cầu cài qua MSI',
        actionLabel: 'Tải .msi',
        downloadUrl:
          'https://github.com/thinlam/SmartTaskManagers/releases/latest/download/smart-task-manager_0.1.0_x64_en-US.msi',
      },
    ],
    features: [
      { title: 'Dashboard & Today', desc: 'KPI, Focus Today và các task cần chú ý nhất.' },
      { title: 'Kanban, Calendar, Gantt', desc: 'Ba góc nhìn từ cùng một nguồn dữ liệu Tasks.' },
      {
        title: 'SmartScore & Risk',
        desc: 'Điểm ưu tiên 0-100 giải thích được, cấu hình trong Settings.',
      },
      { title: 'Nhắc deadline', desc: 'Thông báo quá hạn, đến hạn hôm nay và task bị chặn.' },
      { title: 'Dự án & Thành viên', desc: 'Project Health và workload của từng người.' },
      { title: 'Báo cáo', desc: 'Báo cáo ngày, tuần, tháng và hiệu suất dự án.' },
    ],
    installSteps: [
      'Tải Setup.exe và chạy trình cài đặt.',
      'Mở ứng dụng Smart Task Manager vừa cài từ Start Menu.',
      'Đăng nhập (hoặc tạo tài khoản) để bắt đầu quản lý công việc.',
    ],
  },
  {
    id: 'content-manager',
    badge: 'CM',
    name: 'Content Manager',
    shortDesc: 'Lên lịch, theo dõi trạng thái và quản lý nội dung từ ý tưởng đến xuất bản.',
    longDesc: 'Lên lịch, theo dõi trạng thái và quản lý nội dung từ ý tưởng đến xuất bản.',
    tags: ['Excel', 'Google Sheets'],
    category: 'Nội dung',
    status: 'soon',
    platforms: [],
  },
  {
    id: 'giao-trinh-word',
    badge: 'W',
    name: 'Giáo Trình Word Add-in',
    shortDesc:
      'Task Pane hỗ trợ định dạng, chuẩn hóa văn bản và tra cứu phím tắt ngay trong Word.',
    longDesc:
      'Task Pane hỗ trợ định dạng, chuẩn hóa văn bản và tra cứu phím tắt ngay trong Word.',
    tags: ['Word', 'Office Add-in'],
    category: 'Word',
    status: 'ready',
    platforms: [
      {
        label: 'Microsoft Word (Windows)',
        note: 'Setup.exe · cài add-in',
        actionLabel: 'Tải về',
        downloadUrl:
          'https://github.com/thinlam/GiaoTrinhWord/releases/latest/download/GiaoTrinhWord-Setup.exe',
      },
    ],
  },
  {
    id: 'giao-trinh-excel',
    badge: 'X',
    name: 'Giáo Trình Excel Add-in',
    shortDesc: 'Công cụ công thức, làm sạch dữ liệu và bài học thực hành tích hợp trong Excel.',
    longDesc:
      'Công cụ công thức, làm sạch dữ liệu và bài học thực hành tích hợp trong Excel.',
    tags: ['Excel', 'Office Add-in'],
    category: 'Excel',
    status: 'ready',
    platforms: [
      {
        label: 'Microsoft Excel (Windows)',
        note: 'Setup.exe · cài add-in',
        actionLabel: 'Tải về',
        downloadUrl:
          'https://github.com/thinlam/GiaoTrinhExcel/releases/latest/download/GiaoTrinhExcel-Setup.exe',
      },
    ],
  },
  {
    id: 'ai-formula-assistant',
    badge: 'fx',
    name: 'AI Formula Assistant',
    shortDesc: 'Mô tả bằng tiếng Việt, nhận công thức Excel kèm giải thích từng bước.',
    longDesc: 'Mô tả bằng tiếng Việt, nhận công thức Excel kèm giải thích từng bước.',
    tags: ['Excel', 'AI'],
    category: 'AI',
    status: 'beta',
    platforms: [
      {
        label: 'Microsoft Excel (Windows)',
        note: 'Bản Beta · cần đăng ký API key',
        actionLabel: 'Dùng thử Beta',
        downloadUrl:
          'https://github.com/thinlam/AIFormulaAssistant/releases/latest/download/AIFormulaAssistant-Setup.exe',
      },
    ],
  },
  {
    id: 'grammar-checker',
    badge: 'Ab',
    name: 'Grammar Checker',
    shortDesc: 'Kiểm tra chính tả, ngữ pháp và gợi ý viết lại câu cho tài liệu Word.',
    longDesc: 'Kiểm tra chính tả, ngữ pháp và gợi ý viết lại câu cho tài liệu Word.',
    tags: ['Word', 'AI'],
    category: 'AI',
    status: 'soon',
    platforms: [],
  },
  {
    id: 'data-cleaner',
    badge: 'DC',
    name: 'Data Cleaner',
    shortDesc: 'Xóa trùng lặp, cắt khoảng trắng, phát hiện ô lỗi và chuẩn hóa dữ liệu hàng loạt.',
    longDesc:
      'Xóa trùng lặp, cắt khoảng trắng, phát hiện ô lỗi và chuẩn hóa dữ liệu hàng loạt.',
    tags: ['Excel'],
    category: 'Excel',
    status: 'soon',
    platforms: [],
  },
  {
    id: 'template-library',
    badge: 'TL',
    name: 'Template Library',
    shortDesc: 'Mẫu sổ sách, báo cáo và dashboard dùng sẵn để tạo workbook mới nhanh hơn.',
    longDesc: 'Mẫu sổ sách, báo cáo và dashboard dùng sẵn để tạo workbook mới nhanh hơn.',
    tags: ['Excel', '.xltx'],
    category: 'Excel',
    status: 'soon',
    platforms: [],
  },
];

export function getAppById(id: string): AppEntry | undefined {
  return apps.find((app) => app.id === id);
}

export function getFeaturedApp(): AppEntry | undefined {
  return apps.find((app) => app.featured) ?? apps.find((app) => app.status === 'ready');
}

export const categories = ['Tất cả', ...Array.from(new Set(apps.map((app) => app.category)))];
