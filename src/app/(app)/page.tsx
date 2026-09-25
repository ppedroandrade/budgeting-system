import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/sessao";

export default async function Inicio() {
  const usuario = await exigirUsuario();
  redirect(usuario.perfil === "admin" ? "/painel" : "/orcamentos");
}
