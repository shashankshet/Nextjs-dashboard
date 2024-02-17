'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string().min(1,{
   message:"Please select a customer."
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
    required_error:"Please select an invoice status."
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice( prevState: State,  formData: FormData) {
   const formdata= Object.fromEntries(formData.entries())
console.log(formdata)
  const validatedFields=CreateInvoice.safeParse(formdata)

  if(!validatedFields.success){
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const {customerId,status,amount}=validatedFields.data
  const amountInCents=amount*100
  const nowDate=new Date().toISOString().split('T')[0]

 
try {
await sql`INSERT INTO invoices (customer_id,status,amount,date) VALUES (${customerId},${status},${amountInCents},${nowDate})`

} catch (error) {
  return {message:"Database Error: Fail to create Invoice..."}
}
revalidatePath("/dashboard/invoices")
redirect("/dashboard/invoices")
 
}

export async function updateInvoice(
 id: string,
    prevState: State, 
  formData: FormData,
) {

  const updateVoiceFields=UpdateInvoice.safeParse(Object.fromEntries(formData.entries()))

  if(!updateVoiceFields.success){
    return {
      errors:updateVoiceFields.error.flatten().fieldErrors,
      message:"Missing Fields. Failed to Update Invoice."
    }

  }

  const {customerId,amount,status}=updateVoiceFields.data
  const amountInCent=amount*100
  try{
  await sql `UPDATE invoices SET customer_id=${customerId}, amount=${amountInCent}, status=${status} WHERE id=${id}`
  }catch(error){
    return {message:"Database Error: Fail to update Invoice..."}
  }
  revalidatePath("/dashboard/invoices")
  redirect("/dashboard/invoices")
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}