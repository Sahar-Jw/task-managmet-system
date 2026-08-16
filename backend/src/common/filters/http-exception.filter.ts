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

function translateValidation(message: string): string | null {
  let match = message.match(/^(.+) should not be empty$/i);
  if (match) return `حقل ${fieldName(match[1])} مطلوب.`;

  match = message.match(/^(.+) must be a string$/i);
  if (match) return `يجب أن يكون حقل ${fieldName(match[1])} نصاً.`;

  match = message.match(/^(.+) must be a UUID$/i);
  if (match) return `قيمة ${fieldName(match[1])} غير صالحة.`;

  match = message.match(/^(.+) must be a valid ISO 8601 date string$/i);
  if (match) return `تاريخ ${fieldName(match[1])} غير صالح.`;

  match = message.match(/^(.+) must be a boolean value$/i);
  if (match) return `يجب أن تكون قيمة ${fieldName(match[1])} صحيحة أو خاطئة.`;

  match = message.match(/^(.+) must be a boolean string$/i);
  if (match) return `قيمة ${fieldName(match[1])} غير صالحة.`;

  match = message.match(/^(.+) must be an email$/i);
  if (match) return `يرجى إدخال بريد إلكتروني صالح في حقل ${fieldName(match[1])}.`;

  match = message.match(/^(.+) must be longer than or equal to (\d+) characters$/i);
  if (match) return `يجب ألا يقل حقل ${fieldName(match[1])} عن ${match[2]} أحرف.`;

  match = message.match(/^(.+) must be shorter than or equal to (\d+) characters$/i);
  if (match) return `يجب ألا يزيد حقل ${fieldName(match[1])} عن ${match[2]} حرفاً.`;

  match = message.match(/^property (.+) should not exist$/i);
  if (match) return `الحقل ${fieldName(match[1])} غير مسموح به.`;

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
      (/not found$/i.test(message) ? 'العنصر المطلوب غير موجود.' : undefined) ||
      (/is required/i.test(message) ? 'يرجى تعبئة جميع الحقول المطلوبة.' : undefined) ||
      STATUS_AR[status] ||
      'تعذر إتمام العملية. يرجى المحاولة مرة أخرى.'
    );
  };

  return {
    message: Array.isArray(messages) ? messages.map(one) : one(messages),
    code: Array.isArray(messages) ? 'VALIDATION_ERROR' : codeFor(status),
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

    response.status(status).json({
      statusCode: status,
      code: localized.code,
      error: localizeErrorLabel(error, locale),
      message: localized.message,
      locale,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
