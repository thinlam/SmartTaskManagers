export interface SampleSegment {
  start: string;
  speaker: string;
  text: string;
}

export interface SampleRecording {
  id: string;
  title: string;
  preview: string;
  date: string;
  duration: string;
  status: 'Hoàn tất' | 'Đang xử lý';
  category: 'Cuộc họp' | 'Phỏng vấn' | 'Ghi chú cá nhân';
  speakerCount: number;
  summary: string;
  todos: string[];
  keywords: string[];
  segments: SampleSegment[];
}

export const SAMPLE_RECORDINGS: SampleRecording[] = [
  {
    id: 'hop-ke-hoach-quy',
    title: 'Họp kế hoạch quý – nhóm sản phẩm',
    preview: 'Chào mọi người, hôm nay chúng ta sẽ đi qua kế hoạch cho quý tới…',
    date: '18/10/2026',
    duration: '42:05',
    status: 'Hoàn tất',
    category: 'Cuộc họp',
    speakerCount: 2,
    summary:
      'Nhóm thống nhất chốt phạm vi trước khi ước lượng, bắt đầu từ phần giao diện, sau đó phân công theo từng hạng mục.',
    todos: ['Chốt phạm vi quý tới', 'Gửi bản phác thảo giao diện trước thứ Sáu', 'Ước lượng thời gian từng hạng mục'],
    keywords: ['phạm vi', 'giao diện', 'phân công', 'ước lượng'],
    segments: [
      { start: '12:30', speaker: 'Người nói 1', text: 'Chào mọi người, hôm nay chúng ta sẽ đi qua kế hoạch cho quý tới và phân công công việc.' },
      { start: '12:37', speaker: 'Người nói 2', text: 'Mình đề xuất chốt phạm vi trước, sau đó mới ước lượng thời gian cho từng hạng mục.' },
      { start: '12:45', speaker: 'Người nói 1', text: 'Được, vậy ta bắt đầu từ phần giao diện, rồi đến phần xử lý dữ liệu phía sau.' },
      { start: '12:58', speaker: 'Người nói 2', text: 'Mình sẽ gửi bản phác thảo trước thứ Sáu để cả nhóm góp ý.' },
    ],
  },
  {
    id: 'phong-van-thiet-ke',
    title: 'Phỏng vấn ứng viên – vị trí thiết kế',
    preview: 'Bạn có thể kể về dự án gần nhất mà bạn tự hào nhất không…',
    date: '17/10/2026',
    duration: '55:12',
    status: 'Hoàn tất',
    category: 'Phỏng vấn',
    speakerCount: 2,
    summary: 'Ứng viên trình bày một dự án redesign gần đây, nhấn mạnh vào quy trình nghiên cứu người dùng.',
    todos: ['Gửi phản hồi cho ứng viên trong tuần', 'Trao đổi thêm với đội thiết kế'],
    keywords: ['phỏng vấn', 'thiết kế', 'nghiên cứu người dùng'],
    segments: [
      { start: '00:10', speaker: 'Người nói 1', text: 'Bạn có thể kể về dự án gần nhất mà bạn tự hào nhất không?' },
      { start: '00:22', speaker: 'Người nói 2', text: 'Mình từng dẫn dắt redesign cho một ứng dụng đặt lịch, tập trung vào rút ngắn luồng đặt chỗ.' },
    ],
  },
  {
    id: 'ghi-chu-y-tuong',
    title: 'Ghi chú ý tưởng cuối tuần',
    preview: 'Ý tưởng cho ứng dụng nhắc việc bằng giọng nói…',
    date: '16/10/2026',
    duration: '03:48',
    status: 'Hoàn tất',
    category: 'Ghi chú cá nhân',
    speakerCount: 1,
    summary: 'Ý tưởng sơ bộ về một ứng dụng nhắc việc điều khiển bằng giọng nói, ưu tiên thao tác nhanh.',
    todos: ['Phác thảo luồng chính', 'Tìm hiểu API nhận dạng giọng nói'],
    keywords: ['ý tưởng', 'nhắc việc', 'giọng nói'],
    segments: [
      { start: '00:02', speaker: 'Người nói 1', text: 'Ý tưởng cho ứng dụng nhắc việc bằng giọng nói, chỉ cần nói ra là tạo task luôn.' },
    ],
  },
  {
    id: 'buoi-hoc-truc-tuyen',
    title: 'Buổi học trực tuyến – chương 4',
    preview: 'Đang chuyển giọng nói thành văn bản…',
    date: '15/10/2026',
    duration: '1:12:30',
    status: 'Đang xử lý',
    category: 'Cuộc họp',
    speakerCount: 1,
    summary: '',
    todos: [],
    keywords: [],
    segments: [],
  },
  {
    id: 'cuoc-goi-khach-hang',
    title: 'Cuộc gọi với khách hàng',
    preview: 'Cảm ơn anh đã dành thời gian, em xin phép tóm tắt lại yêu cầu…',
    date: '14/10/2026',
    duration: '28:44',
    status: 'Hoàn tất',
    category: 'Cuộc họp',
    speakerCount: 2,
    summary: 'Khách hàng yêu cầu bổ sung báo cáo xuất CSV và nhắc hạn trước cuối tháng.',
    todos: ['Gửi bản demo báo cáo CSV', 'Xác nhận lại deadline cuối tháng'],
    keywords: ['khách hàng', 'báo cáo', 'CSV'],
    segments: [
      { start: '00:05', speaker: 'Người nói 1', text: 'Cảm ơn anh đã dành thời gian, em xin phép tóm tắt lại yêu cầu của bên mình.' },
      { start: '00:18', speaker: 'Người nói 2', text: 'Vâng, quan trọng nhất là có thêm báo cáo xuất CSV trước cuối tháng.' },
    ],
  },
];
