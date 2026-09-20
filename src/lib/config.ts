export const SITE_CONFIG = {
  name: "อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา",
  shortName: "Sci-Park Phayao",
  englishName: "Phayao Science and Astronomy Park",
  department: "กองการศึกษา ศาสนาและวัฒนธรรม องค์การบริหารส่วนจังหวัดพะเยา",
  address: "เลขที่ 111 หมู่ 8 ต.บ้านต๋อม อ.เมืองพะเยา จ.พะเยา 56000",
  phone: "054-480-194",
  phoneDisplay: "054-480-194",
  facebookUrl: "https://www.facebook.com/sciparkphayao",
  facebookName: "อุทยานวิทยาศาสตร์และดาราศาสตร์ อบจ.พะเยา",
  openingHours: "วันอังคาร - วันอาทิตย์ 08:30 - 16:30 น.",
  closedDaysNote: "ปิดทำการทุกวันจันทร์ และวันหยุดนักขัตฤกษ์",
  maxBookingDaysAhead: 30, // สามารถจองล่วงหน้าได้ 30 วัน
  maxVisitorsPerSlot: 200, // รองรับผู้เข้าชมได้สูงสุด 200 คนต่อรอบ
  
  // โซนจัดแสดงและไฮไลท์
  zones: [
    {
      id: "planetarium",
      title: "โดมท้องฟ้าจำลอง 4K (Digital Planetarium 360°)",
      subtitle: "ระบบฉายภาพดาราศาสตร์และอวกาศ 4K รอบทิศทาง",
      description: "ท่องไปในห้วงอวกาศ ชมกลุ่มดาว ระบบสุริยะ และกาแล็กซีอันไกลโพ้น พร้อมการบรรยายสดจากวิทยากรดาราศาสตร์",
      image: "/images/planetarium_hero.png",
      tag: "ไฮไลท์ยอดนิยม",
      tagColor: "purple"
    },
    {
      id: "ai_robotics",
      title: "นิทรรศการหุ่นยนต์ AI และโลกเสมือน (Metaverse)",
      subtitle: "เทคโนโลยีล้ำยุคและปัญญาประดิษฐ์",
      description: "ทดลองบังคับหุ่นยนต์ สัมผัสประสบการณ์โลกเสมือนจริง VR/AR และเรียนรู้พื้นฐานการเขียนโปรแกรม Coding",
      image: "/images/robotics_ai_zone.png",
      tag: "Interactive AI",
      tagColor: "cyan"
    },
    {
      id: "kwan_ecology",
      title: "นิเวศวิทยากว๊านพะเยาและทรัพยากรธรรมชาติ",
      subtitle: "แหล่งน้ำจืดที่ใหญ่ที่สุดในภาคเหนือตอนบน",
      description: "เรียนรู้ระบบนิเวศ พันธุ์ปลาท้องถิ่น พืชน้ำ และความหลากหลายทางชีวภาพอันทรงคุณค่าของกว๊านพะเยา",
      image: "/images/kwan_phayao_eco.png",
      tag: "วิทยาศาสตร์สิ่งแวดล้อม",
      tagColor: "teal"
    },
    {
      id: "basic_science",
      title: "ห้องทดลองวิทยาศาสตร์แสนสนุก (Hands-on Labs)",
      subtitle: "ฟิสิกส์ เคมี และชีววิทยาผ่านการลงมือทำ",
      description: "ชุดการทดลองแรงโน้มถ่วง แสง เสียง เลนส์ และสนามแม่เหล็ก ที่เปิดโอกาสให้นักเรียนได้ทดลองด้วยตนเอง",
      image: "/images/planetarium_hero.png",
      tag: "ทดลองจริง",
      tagColor: "blue"
    }
  ],

  // ประเภทคณะผู้เข้าชม
  visitorTypes: [
    { id: "school", label: "สถานศึกษา / โรงเรียน (ทัศนศึกษา)", requiresDetails: true },
    { id: "organization", label: "หน่วยงานราชการ / เอกชน (คณะศึกษาดูงาน)", requiresDetails: true },
    { id: "general_group", label: "กลุ่มคณะ / ชุมชน / ชมรม", requiresDetails: true },
    { id: "family_individual", label: "ประชาชนทั่วไป / ครอบครัว", requiresDetails: false }
  ]
};
