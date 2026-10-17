import {
  genders,
  occupations,
  type Gender,
  type Occupation,
  type SurveyAnswers,
  type SurveySubmissionPayload,
} from '../types/types';

export interface SurveyOption {
  /** Likert score (1–5) of a UMARS item, or the coded value of a demographics option. */
  value: number | string;
  label: string;
}

interface SurveyQuestionBase {
  id: string;
  /** UMARS item number (1–25). Absent for the demographics questions. */
  number?: number;
  title: string;
  text: string;
}

export interface SurveyChoiceQuestion extends SurveyQuestionBase {
  kind?: 'choice';
  options: SurveyOption[];
}

export interface SurveyNumberQuestion extends SurveyQuestionBase {
  kind: 'number';
  min: number;
  max: number;
  placeholder: string;
}

export type SurveyQuestion = SurveyChoiceQuestion | SurveyNumberQuestion;

export const isNumberQuestion = (
  question: SurveyQuestion,
): question is SurveyNumberQuestion => question.kind === 'number';

export interface SurveySection {
  id: string;
  /** Short label used by the section chip strip. */
  label: string;
  title: string;
  subtitle: string;
  questions: SurveyQuestion[];
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'مرد',
  female: 'زن',
};

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  physician: 'پزشک',
  pharmacist: 'داروساز',
  other_health: 'سایر کادر درمان',
  other: 'سایر مشاغل',
};

export const GENDER_OPTIONS: SurveyOption[] = genders.map((value) => ({
  value,
  label: GENDER_LABELS[value],
}));

export const OCCUPATION_OPTIONS: SurveyOption[] = occupations.map((value) => ({
  value,
  label: OCCUPATION_LABELS[value],
}));

export const DEMOGRAPHICS_SECTION: SurveySection = {
  id: 'M',
  label: 'مشخصات',
  title: 'بخش نخست: مشخصات پاسخ‌دهنده',
  subtitle:
    'این سه پرسش برای تحلیل نتایج نظرسنجی به کار می‌روند و بدون هیچ نشانه هویتی ذخیره می‌شوند.',
  questions: [
    {
      id: 'age',
      kind: 'number',
      title: 'سن',
      text: 'سن خود را بر حسب سال وارد کنید (بین ۱۵ تا ۱۲۰ سال).',
      min: 15,
      max: 120,
      placeholder: 'برای نمونه: ۳۲',
    },
    {
      id: 'gender',
      title: 'جنسیت',
      text: 'جنسیت خود را انتخاب کنید.',
      options: GENDER_OPTIONS,
    },
    {
      id: 'occupation',
      title: 'شغل',
      text: 'شغل یا حرفه اصلی خود را انتخاب کنید.',
      options: OCCUPATION_OPTIONS,
    },
  ],
};

export const UMARS_SECTIONS: SurveySection[] = [
  {
    id: 'A',
    label: 'تعامل',
    title: 'بخش A: تعامل (Engagement)',
    subtitle: 'جالب بودن، قابلیت شخصی‌سازی، تعاملی بودن، دارا بودن اعلان‌ها، بازخورد و امکان اشتراک‌گذاری',
    questions: [
      {
        id: 'q1',
        number: 1,
        title: 'علاقه',
        text: 'آیا استفاده از برنامه جالب است؟ آیا اطلاعات خود را در مقایسه با سایر برنامه‌های مشابه به شیوه‌ای جالب ارائه می‌دهد؟',
        options: [
          { value: 1, label: '(۱) اصلاً جالب نیست' },
          { value: 2, label: '(۲) عمدتاً جالب نیست' },
          { value: 3, label: '(۳) خوب است؛ نه جالب است و نه غیرجالب، کاربر را برای مدت کوتاهی درگیر می‌کند (۵ دقیقه)' },
          { value: 4, label: '(۴) نسبتاً جالب است؛ کاربر را برای مدتی درگیر می‌کند (در کل ۵ تا ۱۰ دقیقه)' },
          { value: 5, label: '(۵) بسیار جالب؛ کاربر را حتی در استفاده دوباره درگیر می‌کند' },
        ],
      },
      {
        id: 'q2',
        number: 2,
        title: 'شخصی‌سازی',
        text: 'آیا به شما امکان می‌دهد تنظیمات و اولویت‌هایی را که می‌خواهید (مانند سایز فونت، تم شب و روز) شخصی‌سازی کنید؟',
        options: [
          { value: 1, label: '(۱) به هیچ‌گونه شخصی‌سازی اجازه نمی‌دهد یا نیاز به تنظیم هر بار دارد' },
          { value: 2, label: '(۲) امکان شخصی‌سازی کمی را فراهم می‌کند و این کارکردهای برنامه را محدود می‌کند' },
          { value: 3, label: '(۳) شخصی‌سازی پایه‌ای برای عملکرد مناسب' },
          { value: 4, label: '(۴) گزینه‌های متعددی را برای شخصی‌سازی اجازه می‌دهد' },
          { value: 5, label: '(۵) امکان تنظیم کامل ویژگی‌ها و اولویت‌های کاربر را فراهم می‌کند و همه تنظیمات را به خاطر می‌سپارد' },
        ],
      },
      {
        id: 'q3',
        number: 3,
        title: 'تعامل',
        text: 'آیا اجازه ارسال نظرات کاربر، ارائه بازخورد، دستورات، گزینه‌های اشتراک‌گذاری و غیره را می‌دهد؟',
        options: [
          { value: 1, label: '(۱) بدون ویژگی‌های تعاملی و یا بدون پاسخ به ورودی کاربر' },
          { value: 2, label: '(۲) برخی ویژگی‌های تعاملی اما کافی نیست که عملکرد برنامه را محدود می‌کند' },
          { value: 3, label: '(۳) ویژگی‌های پایه‌ای تعاملی برای عملکرد مناسب' },
          { value: 4, label: '(۴) انواع ویژگی‌های تعاملی، بازخورد و گزینه‌های ورودی کاربر را ارائه می‌دهد' },
          { value: 5, label: '(۵) سطح بسیار بالایی از پاسخگویی از طریق ویژگی‌های تعاملی، بازخورد و گزینه‌های ورودی کاربر' },
        ],
      },
      {
        id: 'q4',
        number: 4,
        title: 'گروه هدف',
        text: 'آیا محتوای برنامه (بصری، زبان نگارش، طراحی) برای مخاطب هدف مناسب است؟',
        options: [
          { value: 1, label: '(۱) کاملاً نامناسب، نامشخص یا گیج‌کننده' },
          { value: 2, label: '(۲) عمدتاً نامناسب، نامشخص یا گیج‌کننده است' },
          { value: 3, label: '(۳) قابل قبول است اما به طور خاص برای مخاطب هدف طراحی نشده است. ممکن است گاهی اوقات نامناسب / نامشخص / گیج‌کننده باشد' },
          { value: 4, label: '(۴) طراحی شده برای مخاطب هدف با مشکلات جزئی' },
          { value: 5, label: '(۵) به طور خاص برای مخاطبان هدف طراحی شده است؛ هیچ مشکلی پیدا نشد' },
        ],
      },
    ],
  },
  {
    id: 'B',
    label: 'عملکرد',
    title: 'بخش B: عملکرد (Functionality)',
    subtitle: 'عملکرد برنامه، یادگیری آسان، جهت‌یابی در برنامه، منطقی بودن قسمت‌های مختلف و طراحی ظاهر برنامه',
    questions: [
      {
        id: 'q5',
        number: 5,
        title: 'عملکرد',
        text: 'ویژگی‌ها، عملکردها و اجزای برنامه (دکمه‌ها، منوها) چقدر دقیق و سریع کار می‌کنند؟',
        options: [
          { value: 1, label: '(۱) برنامه خراب است؛ بدون پاسخ یا پاسخ ناکافی / نادرست' },
          { value: 2, label: '(۲) برخی از عملکردها کار می‌کنند اما تأخیر دارند یا مشکلات فنی عمده دارند' },
          { value: 3, label: '(۳) برنامه به طور کلی کار می‌کند؛ برخی از مشکلات فنی نیاز به تعمیر دارند یا گاهی کند هستند' },
          { value: 4, label: '(۴) عمدتاً عملکرد درست با مشکلات جزئی ناچیز' },
          { value: 5, label: '(۵) پاسخ کامل و به موقع؛ هیچ اشکال فنی یافت نشد' },
        ],
      },
      {
        id: 'q6',
        number: 6,
        title: 'سهولت استفاده',
        text: 'یادگیری نحوه استفاده از برنامه چقدر آسان است؟ لیبل‌ها، نمادها و راهنماهای منو چقدر واضح هستند؟',
        options: [
          { value: 1, label: '(۱) راهنما ندارد؛ لیبل‌های منو و نمادها گیج‌کننده هستند' },
          { value: 2, label: '(۲) زمان یا تلاش زیادی می‌برد' },
          { value: 3, label: '(۳) مقداری زمان یا تلاش نیاز دارد' },
          { value: 4, label: '(۴) آسان برای یادگیری؛ راهنماها واضح هستند' },
          { value: 5, label: '(۵) قادر به استفاده از برنامه بلافاصله وجود دارد؛ ساده است و بدون نیاز به راهنما' },
        ],
      },
      {
        id: 'q7',
        number: 7,
        title: 'جهت‌یابی در برنامه',
        text: 'آیا حرکت بین صفحات نمایش منطقی است؟ آیا برنامه همه پیوندهای لازم بین صفحات نمایش را دارد؟',
        options: [
          { value: 1, label: '(۱) اصلاً ارتباط منطقی بین صفحه نمایش وجود ندارد / جهت‌یابی در برنامه مشکل است' },
          { value: 2, label: '(۲) بعد از زمان و تلاش زیاد قابل درک است' },
          { value: 3, label: '(۳) بعد از مدتی / تلاش قابل درک است' },
          { value: 4, label: '(۴) درک جهت‌یابی در برنامه آسان است' },
          { value: 5, label: '(۵) جریان صفحه نمایش کاملاً منطقی، آسان، واضح و شهودی در سرتاسر برنامه است و یا دارای میانبر است' },
        ],
      },
      {
        id: 'q8',
        number: 8,
        title: 'طراحی ظاهر و اسکرول',
        text: 'آیا اسکرول منطقی است؟ آیا در تمام اجزاء صفحات نمایش با هم سازگار هستند؟',
        options: [
          { value: 1, label: '(۱) کاملاً ناسازگار و گیج‌کننده' },
          { value: 2, label: '(۲) اغلب ناسازگار و گیج‌کننده' },
          { value: 3, label: '(۳) خوب است؛ برخی اوقات ناسازگار / گیج‌کننده' },
          { value: 4, label: '(۴) عمدتاً سازگار / شهودی با مشکلات ناچیز' },
          { value: 5, label: '(۵) کاملاً سازگار و شهودی' },
        ],
      },
    ],
  },
  {
    id: 'C',
    label: 'زیبایی',
    title: 'بخش C: زیبایی‌شناسی (Aesthetics)',
    subtitle: 'طراحی و گرافیک برنامه، جذابیت بصری کلی برنامه، طرح رنگ و هماهنگی و یکپارچگی برنامه',
    questions: [
      {
        id: 'q9',
        number: 9,
        title: 'چیدمان',
        text: 'آیا چیدمان و اندازه دکمه‌ها، نمادها، منوها و محتوای روی صفحه نمایش مناسب است؟',
        options: [
          { value: 1, label: '(۱) طراحی بسیار بد و به‌هم‌ریخته؛ انتخاب، تعیین مکان، دیدن و خواندن برخی از گزینه‌ها غیرممکن است' },
          { value: 2, label: '(۲) طراحی بد، تصادفی و نامشخص؛ برخی از گزینه‌ها برای انتخاب، تعیین مکان، دیدن و خواندن دشوار است' },
          { value: 3, label: '(۳) رضایت‌بخش؛ مشکلات کمی در انتخاب، تعیین مکان، دیدن و خواندن گزینه‌ها وجود دارد' },
          { value: 4, label: '(۴) عمدتاً واضح؛ انتخاب / تعیین مکان / دیدن / خواندن آیتم‌ها ممکن است' },
          { value: 5, label: '(۵) آیتم‌ها حرفه‌ای، ساده، واضح، منظم و منطقی سازماندهی شده‌اند' },
        ],
      },
      {
        id: 'q10',
        number: 10,
        title: 'گرافیک',
        text: 'کیفیت و وضوح گرافیکی مورد استفاده برای دکمه‌ها، نمادها، منوها و محتوا چقدر است؟',
        options: [
          { value: 1, label: '(۱) گرافیک آماتور به نظر می‌رسد؛ طراحی بصری بسیار ضعیف - نامتناسب و از نظر سبک ناسازگار است' },
          { value: 2, label: '(۲) گرافیک با کیفیت پایین / وضوح پایین است؛ طراحی بصری با کیفیت پایین – نامتناسب است' },
          { value: 3, label: '(۳) گرافیک و طراحی بصری با کیفیت متوسط؛ به طور کلی از نظر سبک سازگار است' },
          { value: 4, label: '(۴) گرافیک با کیفیت وضوح بالا و طراحی بصری - عمدتاً متناسب و از نظر سبک ثبات وجود دارد' },
          { value: 5, label: '(۵) گرافیک با کیفیت وضوح بسیار بالا و طراحی بصری - متناسب با سبک ثابت در سراسر برنامه' },
        ],
      },
      {
        id: 'q11',
        number: 11,
        title: 'جذابیت بصری',
        text: 'ظاهر برنامه چقدر خوب است؟',
        options: [
          { value: 1, label: '(۱) زشت، ناخوشایند، طراحی ضعیف و تضاد رنگ‌های نامتجانس' },
          { value: 2, label: '(۲) بد - طراحی ضعیف، استفاده بد از رنگ، از نظر بصری خسته‌کننده' },
          { value: 3, label: '(۳) خوب - متوسط؛ نه خوشایند و نه ناخوشایند' },
          { value: 4, label: '(۴) دلپذیر - گرافیک سازگار و حرفه‌ای طراحی شده است' },
          { value: 5, label: '(۵) زیبا - بسیار جذاب، به‌یادماندنی و برجسته؛ استفاده از رنگ ویژگی‌ها و منوهای برنامه را ارتقا می‌دهد' },
        ],
      },
    ],
  },
  {
    id: 'D',
    label: 'اطلاعات',
    title: 'بخش D: اطلاعات (Information)',
    subtitle: 'حاوی اطلاعات مانند متن، بازخورد، معیارها و مراجع با کیفیت بالا از منبع معتبر',
    questions: [
      {
        id: 'q12',
        number: 12,
        title: 'کیفیت اطلاعات',
        text: 'آیا محتوای برنامه صحیح، خوب نوشته شده و مرتبط با هدف و موضوع برنامه است؟',
        options: [
          { value: 1, label: '(۱) هیچ اطلاعاتی در داخل برنامه وجود ندارد' },
          { value: 2, label: '(۲) نامربوط / نامناسب / نامنسجم / نادرست' },
          { value: 3, label: '(۳) ضعیف؛ به سختی مرتبط / مناسب / منسجم و ممکن است نادرست باشد' },
          { value: 4, label: '(۴) نسبتاً مرتبط / مناسب / منسجم و درست به نظر می‌رسد' },
          { value: 5, label: '(۵) مرتبط / مناسب / منسجم / صحیح' },
          { value: 6, label: '(۶) بسیار مرتبط، مناسب، منسجم و صحیح' },
        ],
      },
      {
        id: 'q13',
        number: 13,
        title: 'کمیت اطلاعات',
        text: 'آیا اطلاعات داخل برنامه جامع اما مختصر است؟',
        options: [
          { value: 1, label: '(۱) هیچ اطلاعاتی در داخل برنامه وجود ندارد' },
          { value: 2, label: '(۲) خیلی کم یا خیلی زیاد' },
          { value: 3, label: '(۳) ناکافی' },
          { value: 4, label: '(۴) خوب است اما جامع یا مختصر نیست' },
          { value: 5, label: '(۵) طیف وسیعی از اطلاعات را ارائه می‌دهد اما دارای جزئیات غیرضروری است یا هیچ لینکی به منابع بیشتر ندارد' },
          { value: 6, label: '(۶) جامع و مختصر؛ حاوی پیوندهایی به اطلاعات و منابع بیشتر است' },
        ],
      },
      {
        id: 'q14',
        number: 14,
        title: 'اطلاعات بصری',
        text: 'آیا توضیح بصری مفاهیم از طریق جداول و نشانگرها واضح، منطقی و صحیح است؟',
        options: [
          { value: 1, label: '(۱) هیچ اطلاعات بصری در برنامه وجود ندارد (مثلاً فقط شامل متن است)' },
          { value: 2, label: '(۲) کاملاً نامشخص / گیج‌کننده / اشتباه' },
          { value: 3, label: '(۳) عمدتاً نامشخص / گیج‌کننده / اشتباه' },
          { value: 4, label: '(۴) خوب است اما اغلب نامشخص / گیج‌کننده / اشتباه' },
          { value: 5, label: '(۵) عمدتاً واضح / منطقی / صحیح با مشکلات ناچیز است' },
          { value: 6, label: '(۶) کاملاً واضح، منطقی و درست' },
        ],
      },
      {
        id: 'q15',
        number: 15,
        title: 'اعتبار منبع',
        text: 'آیا به نظر می‌رسد اطلاعات درون برنامه از منبع معتبری آمده است؟',
        options: [
          { value: 1, label: '(۱) هیچ اطلاعاتی در داخل برنامه وجود ندارد' },
          { value: 2, label: '(۲) منبع مشکوک' },
          { value: 3, label: '(۳) منبع فاقد اعتبار' },
          { value: 4, label: '(۴) مشکوک نیست اما مشروعیت منبع نامشخص است' },
          { value: 5, label: '(۵) احتمالاً از یک منبع قانونی و معتبر می‌آید' },
          { value: 6, label: '(۶) قطعاً از یک منبع قانونی و تخصصی معتبر می‌آید' },
        ],
      },
    ],
  },
  {
    id: 'E',
    label: 'کیفیت ذهنی',
    title: 'بخش E: کیفیت ذهنی برنامه (Subjective Quality)',
    subtitle: 'ارزیابی کلی و دیدگاه شخصی شما نسبت به ارزش برنامه',
    questions: [
      {
        id: 'q16',
        number: 16,
        title: 'توصیه به دیگران',
        text: 'آیا این برنامه را به افرادی که ممکن است از آن بهره‌مند شوند توصیه می‌کنید؟',
        options: [
          { value: 1, label: '(۱) به هیچ وجه من این برنامه را به کسی توصیه نمی‌کنم' },
          { value: 2, label: '(۲) افراد بسیار کمی هستند که من این برنامه را به آن‌ها توصیه کنم' },
          { value: 3, label: '(۳) شاید چند نفر باشند که من این برنامه را به آن‌ها توصیه کنم' },
          { value: 4, label: '(۴) افراد زیادی هستند که من این برنامه را به آن‌ها توصیه می‌کنم' },
          { value: 5, label: '(۵) قطعاً من این برنامه را به همه توصیه می‌کنم' },
        ],
      },
      {
        id: 'q17',
        number: 17,
        title: 'میزان استفاده در آینده',
        text: 'فکر می‌کنید اگر این برنامه به شما مربوط بود، در ۱۲ ماه آینده چند بار از آن استفاده می‌کردید؟',
        options: [
          { value: 1, label: '(۱) هیچ' },
          { value: 2, label: '(۲) ۱ تا ۲ بار' },
          { value: 3, label: '(۳) ۳ تا ۱۰ بار' },
          { value: 4, label: '(۴) ۱۰ تا ۵۰ بار' },
          { value: 5, label: '(۵) بیش از ۵۰ بار' },
        ],
      },
      {
        id: 'q18',
        number: 18,
        title: 'پرداخت هزینه',
        text: 'آیا برای این برنامه هزینه می‌کنید؟',
        options: [
          { value: 1, label: '(۱) قطعاً نه' },
          { value: 2, label: '(۲) نه' },
          { value: 3, label: '(۳) شاید' },
          { value: 4, label: '(۴) بله' },
          { value: 5, label: '(۵) قطعاً بله' },
        ],
      },
      {
        id: 'q19',
        number: 19,
        title: 'امتیاز ستاره‌ای کلی',
        text: 'امتیاز کلی ستاره‌ای شما به این برنامه چقدر است؟',
        options: [
          { value: 1, label: '(۱) ★ یکی از بدترین برنامه‌هایی که استفاده کرده‌ام' },
          { value: 2, label: '(۲) ★★ ضعیف' },
          { value: 3, label: '(۳) ★★★ میانگین' },
          { value: 4, label: '(۴) ★★★★ خوب' },
          { value: 5, label: '(۵) ★★★★★ یکی از بهترین برنامه‌هایی که استفاده کرده‌ام' },
        ],
      },
    ],
  },
  {
    id: 'F',
    label: 'اثربخشی',
    title: 'بخش F: اثربخشی اپلیکیشن (Perceived Impact)',
    subtitle: 'تاثیر برنامه بر آگاهی، دانش، نگرش و رفتار تخصصی تجویز و پایش دارو در سالمندان',
    questions: [
      {
        id: 'q20',
        number: 20,
        title: 'آگاهی',
        text: 'این برنامه آگاهی من را از اهمیت پرداختن به رفتار سلامتی (تجویز ایمن دارو در سالمندان) افزایش داده است.',
        options: [
          { value: 1, label: '(۱) کاملاً مخالفم' },
          { value: 2, label: '(۲) مخالفم' },
          { value: 3, label: '(۳) نه مخالفم نه موافقم' },
          { value: 4, label: '(۴) موافقم' },
          { value: 5, label: '(۵) کاملاً موافقم' },
        ],
      },
      {
        id: 'q21',
        number: 21,
        title: 'دانش',
        text: 'این برنامه دانش / درک من از رفتار سلامتی و ملاحظات دارویی سالمندان را افزایش داده است.',
        options: [
          { value: 1, label: '(۱) کاملاً مخالفم' },
          { value: 2, label: '(۲) مخالفم' },
          { value: 3, label: '(۳) نه مخالفم نه موافقم' },
          { value: 4, label: '(۴) موافقم' },
          { value: 5, label: '(۵) کاملاً موافقم' },
        ],
      },
      {
        id: 'q22',
        number: 22,
        title: 'نگرش',
        text: 'برنامه نگرش من را نسبت به بهبود این رفتار سلامتی تغییر داده است.',
        options: [
          { value: 1, label: '(۱) کاملاً مخالفم' },
          { value: 2, label: '(۲) مخالفم' },
          { value: 3, label: '(۳) نه مخالفم نه موافقم' },
          { value: 4, label: '(۴) موافقم' },
          { value: 5, label: '(۵) کاملاً موافقم' },
        ],
      },
      {
        id: 'q23',
        number: 23,
        title: 'قصد تغییر',
        text: 'برنامه قصد / انگیزه من را برای رسیدگی به این رفتار بهداشتی افزایش داده است.',
        options: [
          { value: 1, label: '(۱) کاملاً مخالفم' },
          { value: 2, label: '(۲) مخالفم' },
          { value: 3, label: '(۳) نه مخالفم نه موافقم' },
          { value: 4, label: '(۴) موافقم' },
          { value: 5, label: '(۵) کاملاً موافقم' },
        ],
      },
      {
        id: 'q24',
        number: 24,
        title: 'جستجوی کمک',
        text: 'این برنامه مرا تشویق می‌کند تا برای رسیدگی به رفتار سلامتی در صورت نیاز به آن کمک و منابع بیشتری دریافت کنم.',
        options: [
          { value: 1, label: '(۱) کاملاً مخالفم' },
          { value: 2, label: '(۲) مخالفم' },
          { value: 3, label: '(۳) نه مخالفم نه موافقم' },
          { value: 4, label: '(۴) موافقم' },
          { value: 5, label: '(۵) کاملاً موافقم' },
        ],
      },
      {
        id: 'q25',
        number: 25,
        title: 'تغییر رفتار',
        text: 'استفاده از این برنامه باعث بهبود رفتار سلامتی و کاهش خطاهای دارویی می‌شود.',
        options: [
          { value: 1, label: '(۱) کاملاً مخالفم' },
          { value: 2, label: '(۲) مخالفم' },
          { value: 3, label: '(۳) نه مخالفم نه موافقم' },
          { value: 4, label: '(۴) موافقم' },
          { value: 5, label: '(۵) کاملاً موافقم' },
        ],
      },
    ],
  },
];

export const UMARS_QUESTIONS = UMARS_SECTIONS.flatMap(
  (section) => section.questions,
);

export const SURVEY_SECTIONS: SurveySection[] = [
  DEMOGRAPHICS_SECTION,
  ...UMARS_SECTIONS,
];

export const ALL_QUESTIONS = SURVEY_SECTIONS.flatMap(
  (section) => section.questions,
);

export const TOTAL_QUESTIONS = ALL_QUESTIONS.length;

/** Key of the local queue/cache of responses (see `UmarsSurveyModal`). */
export const STORAGE_KEY = 'gp-umars-submissions-v2';

export interface SurveyStep {
  sectionId: string;
  index: number;
}

export const FIRST_STEP: SurveyStep = {
  sectionId: SURVEY_SECTIONS[0].id,
  index: 0,
};

/** Moves one question forward/backward across section boundaries; `null` at either end. */
export function findStep(
  current: SurveyStep,
  direction: 1 | -1,
): SurveyStep | null {
  const sectionIndex = SURVEY_SECTIONS.findIndex(
    (section) => section.id === current.sectionId,
  );
  if (sectionIndex < 0) return null;
  const section = SURVEY_SECTIONS[sectionIndex];
  const index = current.index + direction;
  if (index >= 0 && index < section.questions.length)
    return { sectionId: section.id, index };
  const neighbour = SURVEY_SECTIONS[sectionIndex + direction];
  if (!neighbour) return null;
  return {
    sectionId: neighbour.id,
    index: direction === 1 ? 0 : neighbour.questions.length - 1,
  };
}

export function isValidAnswer(
  question: SurveyQuestion,
  value: number | string | undefined,
) {
  if (value === undefined || value === '') return false;
  if (isNumberQuestion(question)) {
    const numeric = typeof value === 'number' ? value : Number(value);
    return (
      Number.isInteger(numeric) &&
      numeric >= question.min &&
      numeric <= question.max
    );
  }
  return question.options.some((option) => option.value === value);
}

/** Demographics questions still unanswered or invalid — gates the final submission. */
export function missingDemographics(answers: Record<string, number | string>) {
  return DEMOGRAPHICS_SECTION.questions.filter(
    (question) => !isValidAnswer(question, answers[question.id]),
  );
}

export function umarsScore(answers: Record<string, number | string>) {
  const values = UMARS_QUESTIONS.filter(
    (question) =>
      isValidAnswer(question, answers[question.id]) &&
      typeof answers[question.id] === 'number',
  ).map((question) => answers[question.id] as number);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    answered: values.length,
    total,
    mean: values.length ? total / values.length : 0,
  };
}

export function answerLabel(
  question: SurveyQuestion,
  value: number | string | undefined,
) {
  if (value === undefined || value === '') return '—';
  if (isNumberQuestion(question)) return String(value);
  return (
    question.options.find((option) => option.value === value)?.label ??
    String(value)
  );
}

/**
 * Builds the payload stored on the server, or `null` when the demographics are
 * incomplete so the caller can surface a validation message instead of sending
 * a request the API would reject.
 */
export function buildSubmission(
  answers: Record<string, number | string>,
  id: string,
  createdAt: string,
): SurveySubmissionPayload | null {
  const age =
    typeof answers.age === 'number' ? answers.age : Number(answers.age);
  const gender = answers.gender;
  const occupation = answers.occupation;
  if (!Number.isInteger(age) || age < 15 || age > 120) return null;
  if (typeof gender !== 'string' || !genders.includes(gender as Gender))
    return null;
  if (
    typeof occupation !== 'string' ||
    !occupations.includes(occupation as Occupation)
  )
    return null;
  const scores: SurveyAnswers = {};
  for (const question of UMARS_QUESTIONS) {
    const value = answers[question.id];
    if (typeof value === 'number' && isValidAnswer(question, value))
      scores[question.id] = value;
  }
  return {
    id,
    createdAt,
    demographics: {
      age,
      gender: gender as Gender,
      occupation: occupation as Occupation,
    },
    answers: scores,
  };
}