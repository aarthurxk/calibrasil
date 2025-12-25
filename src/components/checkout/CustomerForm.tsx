import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FieldErrors {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

interface CustomerFormProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fieldErrors: FieldErrors;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFieldBlur: (field: keyof FieldErrors, value: string) => void;
}

const CustomerForm = ({
  firstName,
  lastName,
  email,
  phone,
  fieldErrors,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneChange,
  onFieldBlur,
}: CustomerFormProps) => {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Identificação</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" className="text-sm font-medium">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            required
            placeholder="Seu nome"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            onBlur={() => onFieldBlur("firstName", firstName)}
            className={`h-11 ${fieldErrors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {fieldErrors.firstName && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {fieldErrors.firstName}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Sobrenome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            required
            placeholder="Seu sobrenome"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            onBlur={() => onFieldBlur("lastName", lastName)}
            className={`h-11 ${fieldErrors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {fieldErrors.lastName && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {fieldErrors.lastName}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          E-mail <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onBlur={() => onFieldBlur("email", email)}
          className={`h-11 ${fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
        {fieldErrors.email && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-medium">
          Telefone <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          required
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={onPhoneChange}
          onBlur={() => onFieldBlur("phone", phone)}
          className={`h-11 ${fieldErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
        {fieldErrors.phone && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {fieldErrors.phone}
          </p>
        )}
      </div>
    </section>
  );
};

export default CustomerForm;
