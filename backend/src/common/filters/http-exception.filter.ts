import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

export type AppLocale = 'en' | 'ar';

const EXACT_AR: Record<string, string> = {
  Unauthorized: 'غير مصرح لك. يرجى تسجيل الدخول.',
  Forbidden: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  'Invalid email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'This account has been deactivated': 'تم تعطيل هذا الحساب. تواصل مع المسؤول.',
  'User not found': 'المستخدم غير موجود.',
  'Project not found': 'المشروع غير موجود.',
  'Task not found': 'المهمة غير موجودة.',
  'Assigned User not found': 'المستخدم المكلّف غير موجود.',
  'Approver not found': 'المعتمد غير موجود.',
  'Email already in use': 'البريد الإلكتروني مستخدم بالفعل.',
  'Department is required for non-Admin Users': 'القسم مطلوب للمستخدمين غير المسؤولين.',
  'Cannot assign a Task to a deactivated User': 'لا يمكن إسناد مهمة إلى مستخدم معطّل.',
  'Cannot assign a Task to an Admin': 'لا يمكن إسناد مهمة إلى مسؤول النظام.',
  'Cannot use a deactivated User as the approver': 'لا يمكن اختيار مستخدم معطّل كمعتمد.',
  'The Task assignee and approver cannot be the same User': 'لا يمكن أن يكون المكلّف والمعتمد للمهمة هو نفس المستخدم.',
  'Task deadline cannot be before the start date': 'لا يمكن أن يكون الموعد النهائي للمهمة قبل تاريخ البدء.',
  'Money range minimum cannot exceed the maximum': 'لا يمكن أن يكون الحد الأدنى للمبلغ أكبر من الحد الأعلى.',
  'Budget minimum and maximum are required when the Task needs a budget': 'الحد الأدنى والحد الأعلى للميزانية مطلوبان عند تفعيل الميزانية للمهمة.',
  'You cannot deactivate your own account': 'لا يمكنك تعطيل حسابك الشخصي.',
  'User is already deactivated': 'المستخدم معطّل بالفعل.',
  'Cannot use an archived Project': 'لا يمكن استخدام مشروع مؤرشف.',
  'Only one level of Sub-tasks is supported': 'يسمح بمستوى واحد فقط من المهام الفرعية.',
  'Cannot add Sub-tasks to a completed, finished, or archived Parent Task': 'لا يمكن إضافة مهام فرعية إلى مهمة رئيسية مكتملة أو منتهية أو مؤرشفة.',
  'An unexpected error occurred. Please try again later.': 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً.',
  'Authentication required': 'المصادقة مطلوبة. يرجى تسجيل الدخول.',
  'You may only access your own record': 'يمكنك الوصول إلى سجلك الشخصي فقط.',
  'You do not have permission to perform this action': 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  'Account is inactive or does not exist': 'الحساب غير نشط أو غير موجود.',
  'Invalid or expired refresh token': 'رمز تحديث الجلسة غير صالح أو منتهي الصلاحية.',
  'Invalid or expired reset token': 'رمز إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.',
  'Missing refresh token': 'رمز تحديث الجلسة مفقود.',
  'Assignment not found': 'التكليف غير موجود.',
  'Comment not found': 'التعليق غير موجود.',
  'Branch not found': 'الفرع غير موجود.',
  'Department not found': 'القسم غير موجود.',
  'Branch code must be unique': 'يجب أن يكون رمز الفرع فريداً.',
  'Department code must be unique': 'يجب أن يكون رمز القسم فريداً.',
  'Cannot add comments to an archived Task': 'لا يمكن إضافة تعليقات إلى مهمة مؤرشفة.',
  'Cannot modify a rating once the Task is archived': 'لا يمكن تعديل التقييم بعد أرشفة المهمة.',
  'A Task can only be rated once it reaches Completed status': 'لا يمكن تقييم المهمة إلا بعد وصولها إلى حالة مكتملة.',
  'Only the Assignee may submit this Task for approval': 'يمكن للمكلّف فقط إرسال هذه المهمة للموافقة.',
  'Only Admin (or a delegated approver) may approve or reject': 'يمكن للمسؤول أو المعتمد المفوّض فقط الموافقة أو الرفض.',
  'Only the Task creator or Admin may rate a completed Task': 'يمكن لمنشئ المهمة أو المسؤول فقط تقييم مهمة مكتملة.',
  'The Assignee cannot rate their own completed work': 'لا يمكن للمكلّف تقييم عمله المكتمل.',
  'Task is not currently pending approval': 'المهمة ليست بانتظار الموافقة حالياً.',
  'You do not have visibility into this Task': 'ليس لديك صلاحية لعرض هذه المهمة.',
  'You may only delete your own comments': 'يمكنك حذف تعليقاتك فقط.',
  'Project end date cannot be before the start date': 'لا يمكن أن يكون تاريخ انتهاء المشروع قبل تاريخ البدء.',
  'This account does not have a valid Role.': 'لا يملك هذا الحساب دوراً صالحاً.',
};

const STATUS_AR: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'الطلب غير صالح. يرجى التحقق من البيانات المدخلة.',
  [HttpStatus.UNAUTHORIZED]: 'انتهت الجلسة أو لم يتم تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.',
  [HttpStatus.FORBIDDEN]: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  [HttpStatus.NOT_FOUND]: 'العنصر المطلوب غير موجود.',
  [HttpStatus.CONFLICT]: 'تعذر تنفيذ العملية بسبب تعارض مع البيانات الحالية.',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'تعذر معالجة البيانات المدخلة.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'عدد الطلبات كبير جداً. يرجى المحاولة بعد قليل.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً.',
};

export function resolveRequestLocale(request: Request): AppLocale {
  const headerLocale = request.headers['x-locale'];
  const explicit = Array.isArray(headerLocale) ? headerLocale[0] : headerLocale;

  if (explicit?.toLowerCase().startsWith('ar')) return 'ar';
  if (explicit?.toLowerCase().startsWith('en')) return 'en';

  const cookie = request.headers.cookie || '';
  const cookieMatch = cookie.match(/(?:^|;\s*)NEXT_LOCALE=(en|ar)(?:;|$)/i);
  if (cookieMatch?.[1]?.toLowerCase() === 'ar') return 'ar';
  if (cookieMatch?.[1]?.toLowerCase() === 'en') return 'en';

  const acceptLanguage = request.headers['accept-language'] || '';
  return acceptLanguage.toLowerCase().includes('ar') ? 'ar' : 'en';
}

function fieldName(raw: string): string {
  return raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();
}

function arabicFieldName(raw: string): string {
  const key = raw.trim().replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  const fields: Record<string, string> = {
    email: 'البريد الإلكتروني', password: 'كلمة المرور', 'full name': 'الاسم الكامل',
    phone: 'رقم الهاتف', title: 'العنوان', description: 'الوصف', reason: 'السبب',
    'start date': 'تاريخ البدء', 'end date': 'تاريخ الانتهاء', 'deadline date': 'الموعد النهائي',
    'project id': 'المشروع', 'department id': 'القسم', 'branch id': 'الفرع',
    'assigned user id': 'المستخدم المكلّف', 'approver id': 'المعتمد', status: 'الحالة',
    priority: 'الأولوية', type: 'النوع', name: 'الاسم', code: 'الرمز', page: 'الصفحة', limit: 'عدد النتائج',
  };
  return fields[key] || fieldName(raw);
}

function translateValidation(message: string): string | null {
  let match = message.match(/^(.+) should not be empty$/i);
  if (match) return `حقل ${arabicFieldName(match[1])} مطلوب.`;

  match = message.match(/^(.+) must be a string$/i);
  if (match) return `يجب أن يكون حقل ${arabicFieldName(match[1])} نصاً.`;

  match = message.match(/^(.+) must be a UUID$/i);
  if (match) return `قيمة ${arabicFieldName(match[1])} غير صالحة.`;

  match = message.match(/^(.+) must be a valid ISO 8601 date string$/i);
  if (match) return `تاريخ ${arabicFieldName(match[1])} غير صالح.`;

  match = message.match(/^(.+) must be a boolean value$/i);
  if (match) return `يجب أن تكون قيمة ${arabicFieldName(match[1])} صحيحة أو خاطئة.`;

  match = message.match(/^(.+) must be a boolean string$/i);
  if (match) return `قيمة ${arabicFieldName(match[1])} غير صالحة.`;

  match = message.match(/^(.+) must be an email$/i);
  if (match) return `يرجى إدخال بريد إلكتروني صالح في حقل ${arabicFieldName(match[1])}.`;

  match = message.match(/^(.+) must be longer than or equal to (\d+) characters$/i);
  if (match) return `يجب ألا يقل حقل ${arabicFieldName(match[1])} عن ${match[2]} أحرف.`;

  match = message.match(/^(.+) must be shorter than or equal to (\d+) characters$/i);
  if (match) return `يجب ألا يزيد حقل ${arabicFieldName(match[1])} عن ${match[2]} حرفاً.`;

  match = message.match(/^property (.+) should not exist$/i);
  if (match) return `الحقل ${arabicFieldName(match[1])} غير مسموح به.`;

  match = message.match(/^(.+) must be one of the following values:/i);
  if (match) return `قيمة حقل ${arabicFieldName(match[1])} غير مدعومة.`;

  match = message.match(/^(.+) must be (?:an integer number|a number conforming to the specified constraints)$/i);
  if (match) return `يجب أن تكون قيمة ${arabicFieldName(match[1])} رقماً صالحاً.`;

  match = message.match(/^(.+) must not be (?:less|greater) than (.+)$/i);
  if (match) return `قيمة ${arabicFieldName(match[1])} خارج النطاق المسموح.`;

  match = message.match(/^(.+) must be an array$/i);
  if (match) return `يجب أن تكون قيمة ${arabicFieldName(match[1])} قائمة.`;

  match = message.match(/^(.+) must be a valid enum value$/i);
  if (match) return `قيمة حقل ${arabicFieldName(match[1])} غير مدعومة.`;

  if (/phone must be 12 digits/i.test(message)) return 'يجب أن يتكون رقم الهاتف من 12 رقماً فقط، مثل 091234567890.';

  return null;
}

function codeFor(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
  };

  return codes[status] || `HTTP_${status}`;
}

function stableCode(message: string, status: number): string {
  const normalized = message
    .replace(/"[^"]*"|'[^']*'/g, ' VALUE ')
    .replace(/\b\d{4}-\d{2}-\d{2}(?:T[^\s]+)?\b/g, ' VALUE ')
    .replace(/\b\d+\b/g, ' VALUE ')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
  return normalized ? normalized.slice(0, 96) : codeFor(status);
}

function translateBusinessError(message: string): string | null {
  if (/not found$/i.test(message)) return 'العنصر المطلوب غير موجود.';
  if (/already (?:exists|in use)|must be unique|duplicate/i.test(message)) return 'هذه القيمة مستخدمة بالفعل ويجب أن تكون فريدة.';
  if (/cannot be before|cannot exceed|must be (?:before|after|between)/i.test(message)) return 'ترتيب القيم أو التواريخ المدخلة غير صالح.';
  if (/is inactive|deactivated/i.test(message)) return 'لا يمكن تنفيذ العملية لأن العنصر غير نشط.';
  if (/archived/i.test(message)) return 'لا يمكن تنفيذ هذا الإجراء على عنصر مؤرشف.';
  if (/only (?:the )?.+ may|you may only|you can only|cannot .* own/i.test(message)) return 'ليس لديك صلاحية لتنفيذ هذا الإجراء وفقاً لقواعد العمل.';
  if (/required|must be provided/i.test(message)) return 'يرجى تعبئة جميع البيانات المطلوبة.';
  if (/invalid|not a valid/i.test(message)) return 'إحدى القيم المدخلة غير صالحة.';
  if (/pending approval/i.test(message)) return 'لا تتوافق العملية مع حالة الموافقة الحالية.';
  if (/assign|assignee|assignment/i.test(message)) return 'تعذر تنفيذ عملية التكليف بسبب قواعد المهمة الحالية.';
  if (/status|state|completed|finished/i.test(message)) return 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية.';
  if (/file|attachment|upload/i.test(message)) return 'تعذر معالجة الملف أو المرفق المطلوب.';
  return null;
}

export function localizeMessages(
  messages: string | string[],
  locale: AppLocale,
  status: number,
): { message: string | string[]; code: string } {
  const one = (message: string) => {
    if (locale === 'en') return message;

    return (
      EXACT_AR[message] ||
      translateValidation(message) ||
      translateBusinessError(message) ||
      STATUS_AR[status] ||
      'تعذر إتمام العملية. يرجى المحاولة مرة أخرى.'
    );
  };

  return {
    message: Array.isArray(messages) ? messages.map(one) : one(messages),
    code: Array.isArray(messages) ? 'VALIDATION_ERROR' : stableCode(messages, status),
  };
}

function localizeErrorLabel(error: string, locale: AppLocale): string {
  if (locale === 'en') return error;

  const labels: Record<string, string> = {
    BadRequestException: 'طلب غير صالح',
    'Bad Request': 'طلب غير صالح',
    UnauthorizedException: 'غير مصرح',
    Unauthorized: 'غير مصرح',
    ForbiddenException: 'غير مسموح',
    Forbidden: 'غير مسموح',
    NotFoundException: 'غير موجود',
    'Not Found': 'غير موجود',
    ConflictException: 'تعارض',
    Conflict: 'تعارض',
  };

  return labels[error] || 'خطأ';
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const locale = resolveRequestLocale(request);

    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else {
      const body = exceptionResponse as Record<string, any>;
      message = body.message ?? exception.message;
      error = body.error ?? exception.name;
    }

    const localized = localizeMessages(message, locale, status);
    const suppliedCode = typeof exceptionResponse === 'object' && exceptionResponse
      ? (exceptionResponse as Record<string, any>).code
      : undefined;

    response.status(status).json({
      statusCode: status,
      code: suppliedCode || localized.code,
      error: localizeErrorLabel(error, locale),
      message: localized.message,
      locale,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
