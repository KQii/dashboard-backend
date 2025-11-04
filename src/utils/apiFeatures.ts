interface QueryString {
  [key: string]: any;
  page?: string | number;
  sort?: string;
  limit?: string | number;
  fields?: string;
}

export class APIFeatures<T> {
  public data: T[];
  private queryString: QueryString;
  private originalData: T[];

  constructor(data: T[], queryString: QueryString) {
    this.data = data;
    this.originalData = [...data];
    this.queryString = queryString;
  }

  filter(): this {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Filter data based on query parameters
    if (Object.keys(queryObj).length > 0) {
      this.data = this.data.filter((item: any) => {
        return Object.keys(queryObj).every((key) => {
          const value = queryObj[key];
          const itemValue = item[key];

          // Handle null/undefined
          if (itemValue === null || itemValue === undefined) {
            return false;
          }

          // Handle comparison operators
          if (typeof value === "string") {
            // Handle gte, gt, lte, lt operators
            const gteMatch = value.match(/^gte:(.+)$/);
            const gtMatch = value.match(/^gt:(.+)$/);
            const lteMatch = value.match(/^lte:(.+)$/);
            const ltMatch = value.match(/^lt:(.+)$/);

            if (gteMatch) return itemValue >= parseFloat(gteMatch[1]);
            if (gtMatch) return itemValue > parseFloat(gtMatch[1]);
            if (lteMatch) return itemValue <= parseFloat(lteMatch[1]);
            if (ltMatch) return itemValue < parseFloat(ltMatch[1]);

            // String contains (case-insensitive partial match)
            if (typeof itemValue === "string") {
              return itemValue.toLowerCase().includes(value.toLowerCase());
            }
          }

          // Direct equality check for non-string values
          return itemValue === value || itemValue == value;
        });
      });
    }

    return this;
  }

  sort(): this {
    if (this.queryString.sort) {
      const sortFields = (this.queryString.sort as string).split(",");

      this.data = this.data.sort((a: any, b: any) => {
        for (const field of sortFields) {
          const isDescending = field.startsWith("-");
          const fieldName = isDescending ? field.substring(1) : field;

          const aValue = a[fieldName];
          const bValue = b[fieldName];

          if (aValue !== bValue) {
            if (aValue < bValue) return isDescending ? 1 : -1;
            if (aValue > bValue) return isDescending ? -1 : 1;
          }
        }
        return 0;
      });
    }

    return this;
  }

  limitFields(): this {
    if (this.queryString.fields) {
      const fields = (this.queryString.fields as string).split(",");

      this.data = this.data.map((item: any) => {
        const newItem: any = {};
        fields.forEach((field) => {
          if (item.hasOwnProperty(field)) {
            newItem[field] = item[field];
          }
        });
        return newItem;
      });
    }

    return this;
  }

  paginate(): this {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 100;
    const skip = (page - 1) * limit;

    this.data = this.data.slice(skip, skip + limit);

    return this;
  }

  getMetadata() {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 100;
    const total = this.originalData.length;
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}
