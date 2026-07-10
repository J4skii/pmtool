'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { useRoles } from '@/hooks/use-team';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FieldError } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  roleId: z.string().min(1, 'Role is required'),
  jobTitle: z.string().optional(),
});

type InviteInput = z.infer<typeof inviteSchema>;

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const queryClient = useQueryClient();
  const { data: roles } = useRoles();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', roleId: '', jobTitle: '' },
  });

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post('/invitations', {
        email: values.email,
        roleId: values.roleId,
        jobTitle: values.jobTitle || undefined,
      });
      toast.success('Invitation sent');
      await queryClient.invalidateQueries({ queryKey: ['members'] });
      close(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to send invitation');
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="Invite member"
      description="Send an email invitation to join your workspace."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="email"
            placeholder="colleague@company.com"
            className="mt-1"
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <Select id="invite-role" className="mt-1" defaultValue="" {...register('roleId')}>
            <option value="" disabled>
              Select a role
            </option>
            {(roles ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.roleId?.message} />
        </div>
        <div>
          <Label htmlFor="invite-job-title">Job title (optional)</Label>
          <Input id="invite-job-title" placeholder="e.g. Project Manager" className="mt-1" {...register('jobTitle')} />
          <FieldError message={errors.jobTitle?.message} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Send invitation
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
