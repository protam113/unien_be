import {
  CategoryStatus,
  CategoryType,
} from 'src/modules/category/category.constant';

export function buildCategoryFilter(params: {
  startDate?: string;
  endDate?: string;
  status?: string;
  type?: string;
}): Record<string, any> {
  const { startDate, endDate, status, type } = params;
  const filter: Record<string, any> = {};

  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  if (status) {
    const statusArray = status.split(',');
    const validStatuses = statusArray.filter((s) =>
      Object.values(CategoryStatus).includes(s as CategoryStatus),
    );
    if (validStatuses.length > 0) {
      filter.status = { $in: validStatuses };
    }
  }

  if (type) {
    const typeArray = type.split(',');
    const validTypes = typeArray.filter((s) =>
      Object.values(CategoryType).includes(s as CategoryType),
    );
    if (validTypes.length > 0) {
      filter.type = { $in: validTypes };
    }
  }

  return filter;
}
