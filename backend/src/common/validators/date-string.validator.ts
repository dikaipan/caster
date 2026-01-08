import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator that accepts both date-only (YYYY-MM-DD) and ISO 8601 DateTime strings
 */
@ValidatorConstraint({ async: false })
export class IsDateStringFlexibleConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (value === null || value === undefined) {
      return true; // Optional fields can be null/undefined
    }

    if (typeof value !== 'string') {
      return false;
    }

    const dateStr = value.trim();

    // Accept date-only format: YYYY-MM-DD
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyPattern.test(dateStr)) {
      // Validate that it's a valid date
      const date = new Date(dateStr + 'T00:00:00.000Z');
      return !isNaN(date.getTime());
    }

    // Accept ISO 8601 DateTime format: YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss.sssZ
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
    if (iso8601Pattern.test(dateStr)) {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid date string in format YYYY-MM-DD or ISO 8601 DateTime (YYYY-MM-DDTHH:mm:ssZ)`;
  }
}

/**
 * Decorator that validates date strings accepting both YYYY-MM-DD and ISO 8601 DateTime formats
 */
export function IsDateStringFlexible(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDateStringFlexibleConstraint,
    });
  };
}

