// Label + input wrapper: <FormField label="Name"><input ... /></FormField>
function FormField({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default FormField;
