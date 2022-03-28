using System.Net;
using System.Text;

namespace PainterPro
{
	public static class PainterPro
	{
		public static async Task HandleConnectionAsync(this HttpListenerContext context)
		{
			HttpListenerRequest request = context.Request;
			HttpListenerResponse response = context.Response;
			Stream output = response.OutputStream;

			if (request.RawUrl == null)
			{
				response.SendError(400, "Bad request", "No requested URL was specified.");
				return;
			}

			string path = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName, "Website\\", request.RawUrl.Replace('/', '\\').TrimStart('\\'));
			if (!File.Exists(path))
			{
				response.SendError(404, "Not found", "The requested file '" + request.RawUrl + "' could not be found.");
				return;
			}
			Console.Write(" Sending file '" + path + "'");
			response.ContentType = MimeTypes.GetMimeType(path);
			response.ContentLength64 = new FileInfo(path).Length;
			response.AddHeader("Content-Disposition", "inline; filename = \"" + Path.GetFileName(path) + "\"");
			using (Stream fileStream = File.OpenRead(path))
			{
				fileStream.CopyTo(output);
			}
			output.Close();
			Console.WriteLine(" Done!");
		}

		public static void SendError(this HttpListenerResponse response, int code, string message, string body = "")
		{
			Console.WriteLine(" " + code.ToString() + ": " + message + ".");

			response.StatusCode = code;
			response.StatusDescription = message;

			byte[] bytes = Encoding.UTF8.GetBytes("<html><body><h1>" + code.ToString() + ": " + message + "</h1><hr><p>" + body + "</p></body></html>");
			response.ContentLength64 = bytes.Length;

			Stream output = response.OutputStream;
			output.Write(bytes);
			output.Close();
		}
	}

	public static class Program
	{
		public static void Main()
		{
			HttpListener listener = new HttpListener();
			listener.Prefixes.Add("http://localhost:5000/");
			listener.Start();
			while (true)
			{
				Console.Write("Awaiting connection...");
				Task task = listener.GetContext().HandleConnectionAsync();
			}
		}
	}
}