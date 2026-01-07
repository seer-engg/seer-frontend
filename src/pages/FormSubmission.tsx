import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getBackendBaseUrl } from '@/lib/api-client';

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  default?: unknown;
}

interface FormInfo {
  subscription_id: number;
  workflow_name: string;
  workflow_description: string | null;
  form_fields: FormField[];
  form_url: string;
}

type FormState = 'loading' | 'ready' | 'submitting' | 'success' | 'error';

export default function FormSubmission() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const [formState, setFormState] = useState<FormState>('loading');
  const [formInfo, setFormInfo] = useState<FormInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!subscriptionId) {
      setFormState('error');
      setErrorMessage('Invalid form URL');
      return;
    }

    const fetchFormInfo = async () => {
      try {
        const response = await fetch(
          `${getBackendBaseUrl()}/v1/forms/${subscriptionId}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to load form: ${response.statusText}`);
        }
        const data = await response.json();
        setFormInfo(data);

        // Initialize form data with defaults
        const initialData: Record<string, string> = {};
        data.form_fields.forEach((field: FormField) => {
          if (field.default !== undefined && field.default !== null) {
            initialData[field.name] = String(field.default);
          } else {
            initialData[field.name] = '';
          }
        });
        setFormData(initialData);
        setFormState('ready');
      } catch (error) {
        console.error('Failed to fetch form info', error);
        setFormState('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load form',
        );
      }
    };

    fetchFormInfo();
  }, [subscriptionId]);

  const validateForm = (): boolean => {
    if (!formInfo) return false;

    const errors: Record<string, string> = {};
    formInfo.form_fields.forEach((field) => {
      if (field.required && !formData[field.name]?.trim()) {
        errors[field.name] = 'This field is required';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setFormState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${getBackendBaseUrl()}/v1/forms/${subscriptionId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Submission failed: ${response.statusText}`,
        );
      }

      setFormState('success');
    } catch (error) {
      console.error('Form submission error', error);
      setFormState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to submit form. Please try again.',
      );
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const renderFormField = (field: FormField) => {
    const fieldValue = formData[field.name] || '';
    const hasError = Boolean(validationErrors[field.name]);

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </Label>
          {field.required && (
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              Required
            </Badge>
          )}
          <Badge variant="secondary" className="h-4 px-1 text-[9px]">
            {field.type}
          </Badge>
        </div>
        <Input
          id={field.name}
          name={field.name}
          type={field.type === 'number' ? 'number' : 'text'}
          value={fieldValue}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
          className={hasError ? 'border-destructive' : ''}
          placeholder={field.required ? 'Required' : 'Optional'}
        />
        {hasError && (
          <p className="text-xs text-destructive">{validationErrors[field.name]}</p>
        )}
      </div>
    );
  };

  if (formState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading form...</p>
        </div>
      </div>
    );
  }

  if (formState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Form submitted successfully!</h2>
            <p className="text-muted-foreground">
              Your submission has been received and the workflow has been triggered.
            </p>
          </div>
          <Button
            onClick={() => {
              setFormState('ready');
              setFormData({});
              if (formInfo) {
                const initialData: Record<string, string> = {};
                formInfo.form_fields.forEach((field) => {
                  if (field.default !== undefined && field.default !== null) {
                    initialData[field.name] = String(field.default);
                  } else {
                    initialData[field.name] = '';
                  }
                });
                setFormData(initialData);
              }
            }}
            variant="outline"
          >
            Submit another response
          </Button>
        </div>
      </div>
    );
  }

  if (formState === 'error' || !formInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Unable to load form</h2>
            <p className="text-muted-foreground">
              {errorMessage || 'The form could not be loaded. Please check the URL and try again.'}
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-5 w-5" />
              <span className="text-sm">Workflow Form</span>
            </div>
            <h1 className="text-3xl font-bold">{formInfo.workflow_name}</h1>
            {formInfo.workflow_description && (
              <p className="text-muted-foreground">{formInfo.workflow_description}</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border bg-card p-6 space-y-6">
              {formInfo.form_fields.map((field) => renderFormField(field))}
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-destructive">Submission error</p>
                    <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={formState === 'submitting'}
                className="flex-1"
              >
                {formState === 'submitting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const initialData: Record<string, string> = {};
                  formInfo.form_fields.forEach((field) => {
                    if (field.default !== undefined && field.default !== null) {
                      initialData[field.name] = String(field.default);
                    } else {
                      initialData[field.name] = '';
                    }
                  });
                  setFormData(initialData);
                  setValidationErrors({});
                  setErrorMessage('');
                }}
              >
                Reset
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            <p>Powered by Seer Workflows</p>
          </div>
        </div>
      </div>
    </div>
  );
}
