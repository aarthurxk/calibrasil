import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const Settings = () => {
  const handleSave = () => {
    toast.info('Settings management requires backend setup. Connect Lovable Cloud to enable this feature.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your store configuration</p>
      </div>

      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input id="storeName" defaultValue="Cali Beach Tech" />
            </div>
            <div>
              <Label htmlFor="storeEmail">Store Email</Label>
              <Input id="storeEmail" type="email" defaultValue="hello@cali.com" />
            </div>
          </div>
          <div>
            <Label htmlFor="storeDescription">Store Description</Label>
            <Input
              id="storeDescription"
              defaultValue="Premium beach-tech products for the modern coastal lifestyle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Order Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for new orders
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Low Stock Alerts</p>
              <p className="text-sm text-muted-foreground">
                Get notified when products are running low
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Customer Messages</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications for customer inquiries
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Abandoned Cart Emails</p>
              <p className="text-sm text-muted-foreground">
                Automatically send recovery emails to customers
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" defaultValue="USD" />
            </div>
            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input id="taxRate" type="number" defaultValue="8.25" />
            </div>
          </div>
          <div className="p-4 bg-cali-teal-light rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">Payment Gateway:</strong> Connect Lovable Cloud 
              and enable Stripe to configure payment processing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="freeShipping">Free Shipping Threshold ($)</Label>
              <Input id="freeShipping" type="number" defaultValue="75" />
            </div>
            <div>
              <Label htmlFor="standardShipping">Standard Shipping Rate ($)</Label>
              <Input id="standardShipping" type="number" defaultValue="9.99" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-gradient-ocean text-primary-foreground">
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
