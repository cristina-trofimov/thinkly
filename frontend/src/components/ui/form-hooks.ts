import React from "react";

export const FormFieldContext = React.createContext<unknown>({});

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  // Keep your logic here
  return fieldContext;
}

// export other helper hooks or contexts here if needed
