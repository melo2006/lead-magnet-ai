import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface QuickAddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

const initialForm = {
  owner_name: "",
  business_name: "",
  website_url: "",
  email: "",
  phone: "",
  formatted_address: "",
  city: "",
  state: "",
};

const QuickAddProspectDialog = ({ open, onOpenChange, onAdded }: QuickAddProspectDialogProps) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const isValid =
    form.owner_name.trim() &&
    form.business_name.trim() &&
    form.website_url.trim() &&
    form.email.trim() &&
    form.phone.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    try {
      const placeId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { error } = await supabase.from("prospects").insert({
        owner_name: form.owner_name.trim(),
        business_name: form.business_name.trim(),
        website_url: form.website_url.trim(),
        owner_email: form.email.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        owner_phone: form.phone.trim(),
        formatted_address: form.formatted_address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        place_id: placeId,
        pipeline_stage: "new",
        lead_temperature: "warm",
        tags: ["manual-entry"],
      });

      if (error) throw error;

      toast.success(`${form.business_name} added successfully!`);
      setForm(initialForm);
      onOpenChange(false);
      onAdded();
    } catch (err: any) {
      toast.error(err.message || "Failed to add prospect");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Quick Add Prospect
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Contact Name *</Label>
              <Input placeholder="John Smith" value={form.owner_name} onChange={set("owner_name")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Business Name *</Label>
              <Input placeholder="Acme Corp" value={form.business_name} onChange={set("business_name")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Website *</Label>
            <Input placeholder="https://example.com" value={form.website_url} onChange={set("website_url")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" placeholder="john@acme.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone *</Label>
              <Input type="tel" placeholder="+1 555-123-4567" value={form.phone} onChange={set("phone")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Input placeholder="123 Main St" value={form.formatted_address} onChange={set("formatted_address")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input placeholder="Miami" value={form.city} onChange={set("city")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input placeholder="FL" value={form.state} onChange={set("state")} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!isValid || saving}>
              {saving ? "Adding..." : "Add Prospect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddProspectDialog;
