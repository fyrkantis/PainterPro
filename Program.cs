using Scriban;
using Scriban.Parsing;
using Scriban.Runtime;
using System.Net;
using System.Text;

namespace PainterPro
{
	public static class PainterPro
	{
		public static string currentDirectory = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName;
		public static async Task HandleConnectionAsync(this HttpListenerContext context)
		{
			HttpListenerRequest request = context.Request;
			HttpListenerResponse response = context.Response;
			Stream output = response.OutputStream;

			

			if (request.Url == null)
			{
				response.SendError(400, "Bad Request", "No requested URL was specified.");
				return;
			}
			if (request.Url.LocalPath == "/")
			{
				response.SendRedirect("/index.html", 308, "Permanent Redirect");
				return;
			}

			if (request.HttpMethod.ToLower() == "post")
			{
				HandlePost(request);
			}

			string path = Path.Combine(currentDirectory, "Website\\", request.Url.LocalPath.Replace('/', '\\').TrimStart('\\'));
			if (!File.Exists(path))
			{
				response.SendError(404, "Not Found", "The requested file '" + request.RawUrl + "' could not be found.");
				return;
			}
			
			response.ContentType = MimeTypes.GetMimeType(path);
			response.AddHeader("Content-Disposition", "inline; filename = \"" + Path.GetFileName(path) + "\"");
			Console.Write(response.ContentType);
			if (!response.ContentType.EndsWith("html"))
			{
				Console.Write(" Sending file '" + path + "'");
				response.ContentLength64 = new FileInfo(path).Length;
				using (Stream fileStream = File.OpenRead(path))
				{
					fileStream.CopyTo(output);
				}
			}
			else
			{
				Console.Write(" Converting");
				ScriptObject script = new ScriptObject(); // Used for sending arguments to html template.
				script.Add("thing", "Hello World!");
				TemplateContext templateContext = new TemplateContext();
				templateContext.TemplateLoader = new MyTemplateLoader();
				templateContext.PushGlobal(script);

				Template template = Template.Parse(File.ReadAllText(path, Encoding.UTF8));
				byte[] data = Encoding.UTF8.GetBytes(template.Render(templateContext));

				response.ContentLength64 = data.Length;
				output.Write(data);
			}
			
			output.Close();
			response.Close();
			Console.WriteLine(" Done!");
		}

		public static string HandlePost(HttpListenerRequest request)
		{
			Console.WriteLine(" Reading post:");
			string text;
			using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
			{
				text = reader.ReadToEnd();
			}
			Console.WriteLine(text);
			return "Idk?";
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
			response.Close();
		}

		public static void SendRedirect(this HttpListenerResponse response, string location, int code, string message = "")
		{
			response.StatusCode = code;
			response.StatusDescription = message;
			response.RedirectLocation = location;
			response.OutputStream.Close();
			response.Close();
		}

		public class MyTemplateLoader : ITemplateLoader
		{
			public string GetPath(TemplateContext context, SourceSpan callerSpan, string templateName) // TODO: Adapt for relative paths.
			{
				return Path.Combine(currentDirectory, "Website\\", templateName.Replace('/', '\\').TrimStart('\\'));
			}

			public string Load(TemplateContext context, SourceSpan callerSpan, string templatePath)
			{
				return File.ReadAllText(templatePath, Encoding.UTF8);
			}

			public ValueTask<string> LoadAsync(TemplateContext context, SourceSpan callerSpan, string templatePath)
			{
				throw new NotImplementedException();
			}
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