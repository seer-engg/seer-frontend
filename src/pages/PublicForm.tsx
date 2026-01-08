import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { getBackendBaseUrl } from '@/lib/api-client';

interface FormField {
  name: string;
  displayLabel?: string;
  description?: string;
  type: 'text' | 'number' | 'email' | 'url' | 'object';
  required: boolean;
  placeholder?: string;
}

interface FormConfig {
  form_id: number;
  title: string;
  description?: string;
  fields: FormField[];
  submit_button_text: string;
  success_message: string;
  styling?: Record<string, any>;
}

export default function PublicForm() {
  const { suffix } = useParams<{ suffix: string }>();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadForm();
  }, [suffix]);

  const loadForm = async () => {
    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/forms/resolve/${suffix}`);
      if (!res.ok) {
        throw new Error('Form not found');
      }
      const data = await res.json();
      setFormConfig(data);
    } catch (err) {
      toast.error('Form not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formConfig) return;

    // Validate
    const newErrors: Record<string, string> = {};
    formConfig.fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.displayLabel || field.name} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/forms/submit/${suffix}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        if (error.detail?.errors) {
          const fieldErrors: Record<string, string> = {};
          error.detail.errors.forEach((err: string) => {
            fieldErrors.general = err;
          });
          setErrors(fieldErrors);
          toast.error('Please fix the errors below');
          return;
        }
        throw new Error('Submission failed');
      }

      setIsSubmitted(true);
      toast.success(formConfig.success_message || 'Submitted!');
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Form Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The form you're looking for doesn't exist or has been disabled.
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
          <h2 className="text-2xl font-bold">
            {formConfig.success_message || 'Thank You!'}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-card border rounded-lg p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{formConfig.title}</h1>
            {formConfig.description && (
              <p className="text-muted-foreground mt-2">{formConfig.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formConfig.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.displayLabel || field.name}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {field.description && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}

                {field.type === 'object' ? (
                  <Textarea
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, [field.name]: e.target.value });
                      setErrors({ ...errors, [field.name]: '' });
                    }}
                    placeholder={field.placeholder}
                    required={field.required}
                    className={errors[field.name] ? 'border-destructive' : ''}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, [field.name]: e.target.value });
                      setErrors({ ...errors, [field.name]: '' });
                    }}
                    placeholder={field.placeholder}
                    required={field.required}
                    className={errors[field.name] ? 'border-destructive' : ''}
                  />
                )}

                {errors[field.name] && (
                  <p className="text-xs text-destructive">{errors[field.name]}</p>
                )}
              </div>
            ))}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                formConfig.submit_button_text || 'Submit'
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            Powered by <span className="font-semibold">Seer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
