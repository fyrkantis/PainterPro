using System.Net;
using System.Text;

namespace PainterPro
{
	public static class PainterPro
	{
		public static void HandleConnection(this HttpListenerContext context)
		{
			HttpListenerRequest request = context.Request;
			HttpListenerResponse response = context.Response;

			string body = "<html><body><h1>Painter pro</h1><hr><p>It's great.</p></body></html>";
			byte[] data = Encoding.UTF8.GetBytes(body);
			response.ContentLength64 = data.Length;
			Stream output = response.OutputStream;
			output.Write(data);

		}
	}
	public static class Program
	{
		public static void Main()
		{
			HttpListener listener = new HttpListener();
			listener.Prefixes.Add("http://localhost:5000/");
			listener.Start();
			Console.WriteLine("Awaiting connection...");
			while (true)
			{
				listener.GetContext().HandleConnection();
			}
		}
	}
}