type ApiErrorDetails = {
  code?: string;
  email?: string;
  fields?: Record<string, string[]>;
  issues?: { message?: string }[];
};

type ApiErrorResponse = {
  message?: string;
  details?: ApiErrorDetails;
};

const getFieldMessages = (details?: ApiErrorDetails) => {
  if (!details?.fields) {
    return [];
  }

  return Object.values(details.fields).flat().filter(Boolean);
};

const getIssueMessages = (details?: ApiErrorDetails) => {
  if (!details?.issues) {
    return [];
  }

  return details.issues.map((issue) => issue.message).filter(Boolean) as string[];
};

export const getAuthErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again.") => {
  const responseData = (error as { response?: { data?: ApiErrorResponse } })?.response?.data;
  const zodMessages = [...getFieldMessages(responseData?.details), ...getIssueMessages(responseData?.details)];

  if (zodMessages.length > 0) {
    return zodMessages[0];
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const getAuthErrorDetails = (error: unknown) =>
  (error as { response?: { data?: ApiErrorResponse } })?.response?.data?.details;

export const isBusinessAccountRequiredError = (error: unknown): boolean =>
  (error as { response?: { data?: ApiErrorResponse } })?.response?.data?.details?.code ===
  "BUSINESS_ACCOUNT_REQUIRED";
