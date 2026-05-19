import type { ConfigDefinition, ConfigFieldType } from "../../types/connect.ts";
import type { FC } from "react";

interface FormFieldProps {
  def: ConfigDefinition;
  value: string;
  errors: string[];
  onChange: (v: string) => void;
}

type InputFieldType = Exclude<ConfigFieldType, "BOOLEAN" >

const FormField: FC<FormFieldProps> = ({ def, value, errors, onChange }) => {
  const id = `field-${def.name}`;
  const hasError = errors.length > 0;

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {def.display_name}
        {def.required && <span className="required-mark">*</span>}
      </label>
      {def.documentation && <p className="field-doc">{def.documentation}</p>}
      {def.type === 'BOOLEAN' ? (
        <select id={id} value={value} onChange={e => onChange(e.target.value)} className={hasError ? 'has-error' : ''}>
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          id={id}
          type={getFieldType(def.type)}
          value={value}
          placeholder={def.default_value ?? undefined}
          onChange={e => onChange(e.target.value)}
          className={hasError ? 'has-error' : ''}
        />
      )}
      {errors.map((err, i) => <span key={i} className="field-error">{err}</span>)}
    </div>
  );
}


const getFieldType = (type: InputFieldType) => {
  switch (type) {
    case "STRING":
    case "LIST":
    case "CLASS":
      return "text";
    case "INT":
    case "SHORT":
    case "LONG":
    case "DOUBLE":
      return "number";
    case "PASSWORD":
      return "password";

  }
}

export default FormField;